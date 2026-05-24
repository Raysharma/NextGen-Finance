from decimal import Decimal
from datetime import datetime
from io import BytesIO

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import inspect, select, text

from app.core.config import settings
from app.crud import (
    add_transaction,
    authenticate_user,
    create_account,
    create_user,
    ensure_active_account,
    get_account_by_number,
    get_user_accounts,
    get_user_transactions,
    send_profile_otp,
    set_account_status,
    verify_profile_otp,
    update_user_profile,
)
from app.db.base import Base
from app.db.session import engine
from app.deps import get_current_user, get_db, require_admin
from app.models import Account, AccountStatus, TransactionType, User, UserRole
from app.schemas import (
    AccountCreate,
    AccountRead,
    AccountStatusUpdate,
    DepositRequest,
    ProfileOtpRequest,
    ProfileOtpVerify,
    Token,
    TransactionRead,
    TransferRequest,
    UserCreate,
    UserRead,
    UserUpdate,
    WithdrawRequest,
)
from app.services.pdf_statement import build_statement_pdf
from app.security import create_access_token

Base.metadata.create_all(bind=engine)


def ensure_sqlite_user_columns() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    additions = {
        "phone_number": "VARCHAR(20) NOT NULL DEFAULT ''",
        "address": "VARCHAR(255) NOT NULL DEFAULT ''",
        "city": "VARCHAR(100) NOT NULL DEFAULT ''",
        "pincode": "VARCHAR(20) NOT NULL DEFAULT ''",
        "date_of_birth": "VARCHAR(20) NOT NULL DEFAULT ''",
        "profile_update_verified": "INTEGER NOT NULL DEFAULT 0",
        "profile_otp_code": "VARCHAR(10)",
        "profile_otp_expires_at": "DATETIME",
        "last_otp_sent_at": "DATETIME",
    }
    with engine.begin() as connection:
        for column_name, ddl in additions.items():
            if column_name not in existing_columns:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {ddl}"))


ensure_sqlite_user_columns()

app = FastAPI(title=settings.app_name, version="1.0.0")
allowed_origins = [origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "NextGen Finance API is running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health(db=Depends(get_db)):
    db.execute(select(1))
    return {"status": "ok"}


@app.post("/auth/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db=Depends(get_db)):
    return create_user(db, user_in)


@app.post("/auth/profile/send-otp", response_model=dict)
def request_profile_otp(db=Depends(get_db), current_user: User = Depends(get_current_user)):
    otp_code = send_profile_otp(db, current_user)
    payload = {"message": "OTP generated successfully. Use it to verify your profile update."}
    if settings.debug_otp:
        payload["debug_otp"] = otp_code
    return payload


@app.post("/auth/profile/verify-otp", response_model=dict)
def confirm_profile_otp(payload: ProfileOtpVerify, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_profile_otp(db, current_user, payload.otp_code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")
    return {"message": "Profile verified successfully"}


@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return Token(access_token=token)


@app.get("/auth/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.patch("/auth/me", response_model=UserRead)
def update_me(user_in: UserUpdate, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.profile_update_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verify profile with OTP before updating")
    return update_user_profile(db, current_user, user_in)


@app.post("/accounts", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def open_account(
    account_in: AccountCreate,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = create_account(db, current_user, account_in)
    return AccountRead.from_account(account)


@app.get("/accounts/me", response_model=list[AccountRead])
def my_accounts(db=Depends(get_db), current_user: User = Depends(get_current_user)):
    return [AccountRead.from_account(account) for account in get_user_accounts(db, current_user.id)]


@app.get("/accounts/{account_number}", response_model=AccountRead)
def get_account(account_number: str, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    account = get_account_by_number(db, account_number)
    if not account or (account.user_id != current_user.id and current_user.role != UserRole.admin):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return AccountRead.from_account(account)


@app.post("/transactions/deposit", response_model=AccountRead)
def deposit(payload: DepositRequest, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    account = get_account_by_number(db, payload.account_number)
    if not account or account.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    ensure_active_account(account)
    amount = Decimal(payload.amount)
    account.balance = account.balance + amount
    add_transaction(db, TransactionType.deposit, amount, payload.description, destination_account_id=account.id)
    db.add(account)
    db.commit()
    db.refresh(account)
    return AccountRead.from_account(account)


@app.post("/transactions/withdraw", response_model=AccountRead)
def withdraw(payload: WithdrawRequest, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    account = get_account_by_number(db, payload.account_number)
    if not account or account.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    ensure_active_account(account)
    amount = Decimal(payload.amount)
    if account.balance < amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient balance")
    account.balance = account.balance - amount
    add_transaction(db, TransactionType.withdraw, amount, payload.description, source_account_id=account.id)
    db.add(account)
    db.commit()
    db.refresh(account)
    return AccountRead.from_account(account)


@app.post("/transactions/transfer", response_model=dict)
def transfer(payload: TransferRequest, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    source = get_account_by_number(db, payload.source_account_number)
    destination = get_account_by_number(db, payload.destination_account_number)
    if not source or source.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source account not found")
    if not destination:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination account not found")
    if source.account_number == destination.account_number:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot transfer to the same account")

    ensure_active_account(source)
    ensure_active_account(destination)

    amount = Decimal(payload.amount)
    if source.balance < amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient balance")

    source.balance = source.balance - amount
    destination.balance = destination.balance + amount
    add_transaction(
        db,
        TransactionType.transfer_out,
        amount,
        payload.description,
        source_account_id=source.id,
        destination_account_id=destination.id,
    )
    add_transaction(
        db,
        TransactionType.transfer_in,
        amount,
        payload.description,
        source_account_id=source.id,
        destination_account_id=destination.id,
    )
    db.add(source)
    db.add(destination)
    db.commit()
    db.refresh(source)
    db.refresh(destination)
    return {
        "message": "Transfer completed",
        "source_account_balance": source.balance,
        "destination_account_balance": destination.balance,
    }


@app.get("/transactions/me", response_model=list[TransactionRead])
def my_transactions(db=Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_user_transactions(db, current_user.id)


@app.get("/statements/me.pdf")
def download_statement(account_number: str | None = None, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    accounts = get_user_accounts(db, current_user.id)
    if account_number:
        accounts = [account for account in accounts if account.account_number == account_number]
        if not accounts:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    account_ids = [account.id for account in accounts]
    transactions = [transaction for transaction in get_user_transactions(db, current_user.id) if transaction.source_account_id in account_ids or transaction.destination_account_id in account_ids]

    rows = [
        [
            transaction.created_at.strftime("%Y-%m-%d %H:%M"),
            transaction.transaction_type.value,
            f"{transaction.amount}",
            transaction.description or "-",
        ]
        for transaction in transactions
    ]
    pdf_bytes = build_statement_pdf("NextGen Finance - Account Statement", rows)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="rn-bank-statement.pdf"'},
    )


@app.get("/admin/users", response_model=list[UserRead])
def admin_users(db=Depends(get_db), current_user: User = Depends(require_admin)):
    return list(db.execute(select(User).order_by(User.created_at.desc())).scalars())


@app.get("/admin/accounts", response_model=list[AccountRead])
def admin_accounts(db=Depends(get_db), current_user: User = Depends(require_admin)):
    accounts = list(db.execute(select(Account).order_by(Account.created_at.desc())).scalars())
    return [AccountRead.from_account(account) for account in accounts]


@app.patch("/admin/accounts/{account_number}/status", response_model=AccountRead)
def update_account_status(
    account_number: str,
    status_update: AccountStatusUpdate,
    db=Depends(get_db),
    current_user: User = Depends(require_admin),
):
    account = get_account_by_number(db, account_number)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    account = set_account_status(db, account, status_update)
    return AccountRead.from_account(account)
