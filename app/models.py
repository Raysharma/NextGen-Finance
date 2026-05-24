from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, Column, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class UserRole(str, Enum):
    customer = "customer"
    admin = "admin"


class AccountStatus(str, Enum):
    active = "active"
    frozen = "frozen"
    closed = "closed"


class TransactionType(str, Enum):
    deposit = "deposit"
    withdraw = "withdraw"
    transfer_in = "transfer_in"
    transfer_out = "transfer_out"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(120), nullable=False)
    phone_number = Column(String(20), nullable=False, default="")
    address = Column(String(255), nullable=False, default="")
    city = Column(String(100), nullable=False, default="")
    pincode = Column(String(20), nullable=False, default="")
    date_of_birth = Column(String(20), nullable=False, default="")
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.customer)
    is_active = Column(Boolean, nullable=False, default=True)
    profile_update_verified = Column(Boolean, nullable=False, default=False)
    profile_otp_code = Column(String(10), nullable=True)
    profile_otp_expires_at = Column(DateTime, nullable=True)
    last_otp_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    accounts = relationship("Account", back_populates="owner", cascade="all, delete-orphan")


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String(20), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_type = Column(String(30), nullable=False, default="savings")
    balance = Column(Numeric(14, 2), nullable=False, default=0)
    status = Column(SAEnum(AccountStatus), nullable=False, default=AccountStatus.active)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="accounts")
    outgoing_transactions = relationship(
        "Transaction",
        foreign_keys="Transaction.source_account_id",
        back_populates="source_account",
    )
    incoming_transactions = relationship(
        "Transaction",
        foreign_keys="Transaction.destination_account_id",
        back_populates="destination_account",
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(36), unique=True, index=True, nullable=False)
    transaction_type = Column(SAEnum(TransactionType), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    description = Column(String(255), nullable=True)
    source_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    destination_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    source_account = relationship("Account", foreign_keys=[source_account_id], back_populates="outgoing_transactions")
    destination_account = relationship(
        "Account", foreign_keys=[destination_account_id], back_populates="incoming_transactions"
    )
