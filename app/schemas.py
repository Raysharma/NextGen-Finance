from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import AccountStatus, TransactionType, UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone_number: str = Field(min_length=7, max_length=20)
    address: str = Field(min_length=5, max_length=255)
    city: str = Field(min_length=2, max_length=100)
    pincode: str = Field(min_length=4, max_length=20)
    date_of_birth: str = Field(min_length=4, max_length=20)
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    phone_number: Optional[str] = Field(default=None, min_length=7, max_length=20)
    address: Optional[str] = Field(default=None, min_length=5, max_length=255)
    city: Optional[str] = Field(default=None, min_length=2, max_length=100)
    pincode: Optional[str] = Field(default=None, min_length=4, max_length=20)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone_number: str
    address: str
    city: str
    pincode: str
    date_of_birth: str
    role: UserRole
    is_active: bool
    profile_update_verified: bool
    created_at: datetime


class ProfileOtpRequest(BaseModel):
    contact_type: str = Field(default="email", min_length=3, max_length=20)


class ProfileOtpVerify(BaseModel):
    otp_code: str = Field(min_length=4, max_length=10)


class AccountCreate(BaseModel):
    account_type: str = Field(default="savings", min_length=3, max_length=30)
    initial_deposit: Decimal = Field(default=Decimal("0.00"), ge=0)


class AccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_number: str
    account_type: str
    balance: Decimal
    status: AccountStatus
    created_at: datetime
    owner_id: int

    @classmethod
    def from_account(cls, account):
        return cls(
            id=account.id,
            account_number=account.account_number,
            account_type=account.account_type,
            balance=account.balance,
            status=account.status,
            created_at=account.created_at,
            owner_id=account.user_id,
        )


class DepositRequest(BaseModel):
    account_number: str
    amount: Decimal = Field(gt=0)
    description: Optional[str] = Field(default="Cash deposit", max_length=255)


class WithdrawRequest(BaseModel):
    account_number: str
    amount: Decimal = Field(gt=0)
    description: Optional[str] = Field(default="Cash withdrawal", max_length=255)


class TransferRequest(BaseModel):
    source_account_number: str
    destination_account_number: str
    amount: Decimal = Field(gt=0)
    description: Optional[str] = Field(default="Account transfer", max_length=255)


class AccountStatusUpdate(BaseModel):
    status: AccountStatus


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    transaction_type: TransactionType
    amount: Decimal
    description: Optional[str]
    source_account_id: Optional[int]
    destination_account_id: Optional[int]
    created_at: datetime


class LoginForm(BaseModel):
    email: EmailStr
    password: str
