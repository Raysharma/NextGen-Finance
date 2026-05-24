import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select, or_
from sqlalchemy.orm import Session

from app.models import Account, AccountStatus, Transaction, TransactionType, User, UserRole
from app.core.config import settings
from app.schemas import AccountCreate, AccountStatusUpdate, UserCreate, UserUpdate
from app.security import generate_account_number, get_password_hash, verify_password


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.execute(select(User).where(User.email == email)).scalar_one_or_none()


def create_user(db: Session, user_in: UserCreate, role: UserRole = UserRole.customer) -> User:
    if get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(
        full_name=user_in.full_name,
        email=user_in.email.lower(),
        phone_number=user_in.phone_number,
        address=user_in.address,
        city=user_in.city,
        pincode=user_in.pincode,
        date_of_birth=user_in.date_of_birth,
        hashed_password=get_password_hash(user_in.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email.lower())
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_account(db: Session, owner: User, account_in: AccountCreate) -> Account:
    account_number = generate_account_number()
    while db.execute(select(Account).where(Account.account_number == account_number)).scalar_one_or_none():
        account_number = generate_account_number()

    account = Account(
        account_number=account_number,
        user_id=owner.id,
        account_type=account_in.account_type,
        balance=account_in.initial_deposit,
        status=AccountStatus.active,
    )
    db.add(account)
    db.flush()

    if account_in.initial_deposit > 0:
        db.add(
            Transaction(
                reference=str(uuid.uuid4()),
                transaction_type=TransactionType.deposit,
                amount=account_in.initial_deposit,
                description="Initial deposit",
                destination_account_id=account.id,
            )
        )

    db.commit()
    db.refresh(account)
    return account


def get_account_by_number(db: Session, account_number: str) -> Optional[Account]:
    return db.execute(select(Account).where(Account.account_number == account_number)).scalar_one_or_none()


def ensure_active_account(account: Account) -> None:
    if account.status == AccountStatus.closed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is closed")
    if account.status == AccountStatus.frozen:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is frozen")


def get_user_accounts(db: Session, user_id: int) -> List[Account]:
    return list(db.execute(select(Account).where(Account.user_id == user_id).order_by(Account.created_at.desc())).scalars())


def get_user_transactions(db: Session, user_id: int) -> List[Transaction]:
    account_ids = [account.id for account in get_user_accounts(db, user_id)]
    if not account_ids:
        return []
    query = (
        select(Transaction)
        .where(or_(Transaction.source_account_id.in_(account_ids), Transaction.destination_account_id.in_(account_ids)))
        .order_by(Transaction.created_at.desc())
    )
    return list(db.execute(query).scalars())


def update_user_profile(db: Session, user: User, user_in: UserUpdate) -> User:
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.phone_number is not None:
        user.phone_number = user_in.phone_number
    if user_in.address is not None:
        user.address = user_in.address
    if user_in.city is not None:
        user.city = user_in.city
    if user_in.pincode is not None:
        user.pincode = user_in.pincode
    user.profile_update_verified = False
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def send_profile_otp(db: Session, user: User) -> str:
    otp_code = f"{uuid.uuid4().int % 900000 + 100000:06d}"
    user.profile_otp_code = otp_code
    user.profile_otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    user.last_otp_sent_at = datetime.utcnow()
    db.add(user)
    db.commit()
    return otp_code


def verify_profile_otp(db: Session, user: User, otp_code: str) -> bool:
    now = datetime.utcnow()
    if not user.profile_otp_code or not user.profile_otp_expires_at:
        return False
    if user.profile_otp_expires_at < now:
        return False
    if user.profile_otp_code != otp_code:
        return False

    user.profile_update_verified = True
    user.profile_otp_code = None
    user.profile_otp_expires_at = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return True


def set_account_status(db: Session, account: Account, status_update: AccountStatusUpdate) -> Account:
    account.status = status_update.status
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def add_transaction(
    db: Session,
    transaction_type: TransactionType,
    amount: Decimal,
    description: str | None,
    source_account_id: int | None = None,
    destination_account_id: int | None = None,
) -> Transaction:
    transaction = Transaction(
        reference=str(uuid.uuid4()),
        transaction_type=transaction_type,
        amount=amount,
        description=description,
        source_account_id=source_account_id,
        destination_account_id=destination_account_id,
    )
    db.add(transaction)
    return transaction
