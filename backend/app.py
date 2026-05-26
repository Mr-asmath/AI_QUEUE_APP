import json
import os
import secrets
import smtplib
import string
import base64
import hashlib
import hmac
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from email.message import EmailMessage
from functools import wraps

from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from sqlalchemy import case, inspect
from werkzeug.security import check_password_hash, generate_password_hash


load_dotenv()

app = Flask(__name__)
os.makedirs(app.instance_path, exist_ok=True)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-me")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL", "sqlite:///multi_industry_queue.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SESSION_COOKIE_SAMESITE"] = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
app.config["SESSION_COOKIE_SECURE"] = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
CORS_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "CORS_ORIGINS",
        f"{FRONTEND_URL},http://localhost:3000,http://127.0.0.1:3000,https://mr-asmath.github.io",
    ).split(",")
    if origin.strip()
]

CORS(app, supports_credentials=True, origins=CORS_ORIGINS)
db = SQLAlchemy(app)

TOKEN_TTL_MINUTES = int(os.getenv("TOKEN_TTL_MINUTES", "60"))
REMINDER_WINDOW_MINUTES = int(os.getenv("REMINDER_WINDOW_MINUTES", "10"))
AUTOMATION_API_KEY = os.getenv("AUTOMATION_API_KEY", "local-automation-key")
MAIL_SENDER = os.getenv("MAIL_SENDER", "python.asmath1290@gmail.com")
SECURITY_TERMS_TEXT = (
    "I accept the app terms, data security policy, and consent controls. "
    "Passwords are protected with secure hashing, sessions are protected by server cookies, "
    "and optional device details are collected only after permission."
)

ACTIVE_TOKEN_STATUSES = ("requested", "verified", "customer_in", "allocated")
OPERATOR_VISIBLE_TOKEN_STATUSES = ACTIVE_TOKEN_STATUSES + ("cancelled",)
INDUSTRY_TYPES = ("hospital", "school", "bank", "hotel", "office", "government", "other")


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    user_code = db.Column(db.String(6), unique=True, index=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    secret_password_hash = db.Column(db.String(255))
    role = db.Column(db.String(30), default="user", nullable=False)
    phone = db.Column(db.String(40))
    address = db.Column(db.Text)
    area = db.Column(db.String(160))
    city = db.Column(db.String(120))
    state = db.Column(db.String(120))
    pincode = db.Column(db.String(20))
    designation = db.Column(db.String(120))
    emergency_contact = db.Column(db.String(80))
    personal_details = db.Column(db.Text)
    industry_id = db.Column(db.Integer, db.ForeignKey("industries.id"))
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"))
    must_reset_password = db.Column(db.Boolean, default=False)
    avatar_url = db.Column(db.Text)
    avatar_preset = db.Column(db.String(40), default="face-1")
    terms_accepted_at = db.Column(db.DateTime)
    device_consent = db.Column(db.Boolean)
    device_consent_at = db.Column(db.DateTime)
    last_seen_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    industry = db.relationship("Industry", foreign_keys=[industry_id])
    branch = db.relationship("Branch", foreign_keys=[branch_id])

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def set_secret_password(self, password):
        self.secret_password_hash = generate_password_hash(password)

    def check_secret_password(self, password):
        if not self.secret_password_hash:
            self.set_secret_password("1234")
            db.session.commit()
        return check_password_hash(self.secret_password_hash, password)


class Industry(db.Model):
    __tablename__ = "industries"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    industry_type = db.Column(db.String(40), nullable=False)
    other_type_name = db.Column(db.String(120))
    details = db.Column(db.Text)
    admin_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    terms = db.Column(db.Text)
    branch_sharing_mode = db.Column(db.String(30), default="all")
    logo_url = db.Column(db.Text)
    logo_preset = db.Column(db.String(40), default="logo-1")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    admin = db.relationship("User", foreign_keys=[admin_id], post_update=True)


class AccessRequest(db.Model):
    __tablename__ = "access_requests"

    id = db.Column(db.Integer, primary_key=True)
    admin_name = db.Column(db.String(120), nullable=False)
    admin_email = db.Column(db.String(120), nullable=False)
    admin_phone = db.Column(db.String(40))
    industry_name = db.Column(db.String(160), nullable=False)
    industry_type = db.Column(db.String(40), nullable=False)
    other_type_name = db.Column(db.String(120))
    details = db.Column(db.Text)
    status = db.Column(db.String(20), default="pending")
    main_admin_message = db.Column(db.Text)
    generated_password = db.Column(db.String(80))
    industry_id = db.Column(db.Integer, db.ForeignKey("industries.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    decided_at = db.Column(db.DateTime)


class PasswordResetRequest(db.Model):
    __tablename__ = "password_reset_requests"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    requester_name = db.Column(db.String(120), nullable=False)
    requester_email = db.Column(db.String(120), nullable=False)
    requester_role = db.Column(db.String(30), nullable=False)
    status = db.Column(db.String(20), default="pending")
    admin_message = db.Column(db.Text)
    generated_password = db.Column(db.String(80))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    decided_at = db.Column(db.DateTime)

    user = db.relationship("User", foreign_keys=[user_id])
    admin = db.relationship("User", foreign_keys=[admin_id])


class DeviceAudit(db.Model):
    __tablename__ = "device_audits"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    event_type = db.Column(db.String(40), default="consent")
    consent_allowed = db.Column(db.Boolean, default=False, nullable=False)
    display_name_encrypted = db.Column(db.Text)
    device_name_encrypted = db.Column(db.Text)
    place_encrypted = db.Column(db.Text)
    ip_encrypted = db.Column(db.Text)
    user_agent_encrypted = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", foreign_keys=[user_id])


class EventLog(db.Model):
    __tablename__ = "event_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    user_name = db.Column(db.String(160))
    user_role = db.Column(db.String(40))
    industry_id = db.Column(db.Integer, db.ForeignKey("industries.id"))
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"))
    token_id = db.Column(db.Integer, db.ForeignKey("tokens.id"))
    event_type = db.Column(db.String(80), nullable=False)
    message = db.Column(db.String(700), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", foreign_keys=[user_id])
    industry = db.relationship("Industry", foreign_keys=[industry_id])
    branch = db.relationship("Branch", foreign_keys=[branch_id])
    token = db.relationship("Token", foreign_keys=[token_id])


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    token = db.Column(db.String(120), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User")


class Branch(db.Model):
    __tablename__ = "branches"

    id = db.Column(db.Integer, primary_key=True)
    industry_id = db.Column(db.Integer, db.ForeignKey("industries.id"), nullable=False)
    name = db.Column(db.String(160), nullable=False)
    details = db.Column(db.Text)
    branch_type = db.Column(db.String(40), nullable=False)
    other_type_name = db.Column(db.String(120))
    address = db.Column(db.Text)
    area = db.Column(db.String(160))
    city = db.Column(db.String(120))
    state = db.Column(db.String(120))
    pincode = db.Column(db.String(20))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    dashboard_config_json = db.Column(db.Text, default="{}")
    user_schema_json = db.Column(db.Text, default="[]")
    last_token_number = db.Column(db.Integer, default=0)
    current_token_number = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    industry = db.relationship("Industry")


class Token(db.Model):
    __tablename__ = "tokens"

    id = db.Column(db.Integer, primary_key=True)
    token_code = db.Column(db.String(40), unique=True, nullable=False)
    token_number = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    industry_id = db.Column(db.Integer, db.ForeignKey("industries.id"), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False)
    operator_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    provider_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    status = db.Column(db.String(30), default="requested")
    details_json = db.Column(db.Text, default="{}")
    display_name = db.Column(db.String(160))
    name_mode = db.Column(db.String(30), default="default")
    duplicate_key = db.Column(db.String(255), index=True)
    ai_suggestion = db.Column(db.Text)
    emergency_requested = db.Column(db.Boolean, default=False)
    emergency_accepted = db.Column(db.Boolean, default=False)
    emergency_requested_at = db.Column(db.DateTime)
    emergency_accepted_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime, nullable=False)
    reminder_sent_at = db.Column(db.DateTime)
    verified_at = db.Column(db.DateTime)
    customer_in_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", foreign_keys=[user_id])
    industry = db.relationship("Industry")
    branch = db.relationship("Branch")
    operator = db.relationship("User", foreign_keys=[operator_id])
    provider = db.relationship("User", foreign_keys=[provider_id])


class Suggestion(db.Model):
    __tablename__ = "suggestions"

    id = db.Column(db.Integer, primary_key=True)
    token_id = db.Column(db.Integer, db.ForeignKey("tokens.id"), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    suggestion_text = db.Column(db.Text, nullable=False)
    selected_items_json = db.Column(db.Text, default="[]")
    aggregates_json = db.Column(db.Text, default="{}")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    token = db.relationship("Token")
    provider = db.relationship("User", foreign_keys=[provider_id])


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    token_id = db.Column(db.Integer, db.ForeignKey("tokens.id"))
    message = db.Column(db.String(600), nullable=False)
    type = db.Column(db.String(60), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


def as_json(value, fallback):
    if not value:
        return fallback
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return fallback


def dumps(value):
    return json.dumps(value, separators=(",", ":"))


def security_key():
    source = os.getenv("DATA_ENCRYPTION_KEY") or app.config["SECRET_KEY"]
    return hashlib.sha256(source.encode("utf-8")).digest()


def encrypt_text(value):
    if value in (None, ""):
        return None
    nonce = secrets.token_bytes(16)
    key = security_key()
    payload = str(value).encode("utf-8")
    stream = b""
    counter = 0
    while len(stream) < len(payload):
        stream += hashlib.sha256(key + nonce + counter.to_bytes(4, "big")).digest()
        counter += 1
    cipher = bytes(byte ^ stream[index] for index, byte in enumerate(payload))
    signature = hmac.new(key, nonce + cipher, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(nonce + signature + cipher).decode("ascii")


def decrypt_text(value):
    if not value:
        return None
    try:
        raw = base64.urlsafe_b64decode(value.encode("ascii"))
        nonce, signature, cipher = raw[:16], raw[16:48], raw[48:]
        key = security_key()
        expected = hmac.new(key, nonce + cipher, hashlib.sha256).digest()
        if not hmac.compare_digest(signature, expected):
            return "Encrypted data unavailable"
        stream = b""
        counter = 0
        while len(stream) < len(cipher):
            stream += hashlib.sha256(key + nonce + counter.to_bytes(4, "big")).digest()
            counter += 1
        plain = bytes(byte ^ stream[index] for index, byte in enumerate(cipher))
        return plain.decode("utf-8")
    except Exception:
        return "Encrypted data unavailable"


def generate_password(length=10):
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def generate_reset_token():
    return secrets.token_urlsafe(40)


def generate_user_code():
    for _ in range(100):
        code = "".join(secrets.choice(string.digits) for _ in range(6))
        existing = db.session.execute(
            db.text("SELECT id FROM users WHERE user_code = :code LIMIT 1"),
            {"code": code},
        ).first()
        if code != "000000" and not existing:
            return code
    highest_id = db.session.execute(db.text("SELECT COALESCE(MAX(id), 0) FROM users")).scalar() + 1
    return str(100000 + highest_id)[-6:]


def send_email(to_email, subject, body):
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() != "false"

    if not host or not username or not password:
        app.logger.warning(
            "Email not sent because SMTP_HOST, SMTP_USERNAME, or SMTP_PASSWORD is missing. "
            "Sender configured as %s. Intended recipient: %s. Body: %s",
            MAIL_SENDER,
            to_email,
            body,
        )
        return False

    message = EmailMessage()
    message["From"] = MAIL_SENDER
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(host, port, timeout=20) as smtp:
        if use_tls:
            smtp.starttls()
        smtp.login(username, password)
        smtp.send_message(message)
    return True


def send_password_reset_email(user, reset_url):
    body = (
        f"Hello {user.name},\n\n"
        "Use this secure link to set a new password for AI Queue Automation:\n"
        f"{reset_url}\n\n"
        "This link expires in 30 minutes. If you did not request it, you can ignore this email.\n"
    )
    return send_email(user.email, "Reset your AI Queue Automation password", body)


def send_default_password_email(user, password):
    body = (
        f"Hello {user.name},\n\n"
        "Your AI Queue Automation default password has been reset by an admin.\n"
        f"Default password: {password}\n\n"
        "Please sign in and change this password from your profile page.\n"
    )
    return send_email(user.email, "Your AI Queue Automation default password", body)


def normalize_details(details):
    pairs = []
    for key, value in sorted((details or {}).items()):
        pairs.append(f"{str(key).strip().lower()}={str(value).strip().lower()}")
    return "|".join(pairs)


def create_notification(user_id, message, notification_type, token_id=None):
    db.session.add(
        Notification(
            user_id=user_id,
            token_id=token_id,
            message=message,
            type=notification_type,
        )
    )


def record_event(event_type, message, user=None, token=None, industry_id=None, branch_id=None):
    event_user = user or (token.user if token else current_user())
    db.session.add(
        EventLog(
            user_id=event_user.id if event_user else None,
            user_name=event_user.name if event_user else None,
            user_role=event_user.role if event_user else None,
            industry_id=industry_id or (token.industry_id if token else getattr(event_user, "industry_id", None)),
            branch_id=branch_id or (token.branch_id if token else getattr(event_user, "branch_id", None)),
            token_id=token.id if token else None,
            event_type=event_type,
            message=message,
        )
    )


@app.before_request
def touch_current_user():
    if "user_id" in session:
        user = db.session.get(User, session["user_id"])
        if user:
            user.last_seen_at = datetime.utcnow()
            db.session.commit()


@app.after_request
def add_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "geolocation=(self), camera=(), microphone=()")
    if app.config["SESSION_COOKIE_SECURE"]:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"success": False, "error": "Please login first"}), 401
        return fn(*args, **kwargs)

    return wrapper


def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = current_user()
            if not user or user.role not in roles:
                return jsonify({"success": False, "error": "Unauthorized access"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def current_user():
    if "user_id" not in session:
        return None
    return db.session.get(User, session["user_id"])


def is_online(user):
    return bool(user.last_seen_at and user.last_seen_at >= datetime.utcnow() - timedelta(minutes=10))


def client_ip():
    forwarded = request.headers.get("X-Forwarded-For", "")
    return (forwarded.split(",", 1)[0] or request.remote_addr or "").strip()


def record_device_audit(user, details=None, consent_allowed=None, event_type="usage"):
    details = details or {}
    allowed = bool(user.device_consent) if consent_allowed is None else bool(consent_allowed)
    audit = DeviceAudit(
        user_id=user.id if allowed else None,
        event_type=event_type,
        consent_allowed=allowed,
        display_name_encrypted=encrypt_text(user.name if allowed else "Unknown user"),
        device_name_encrypted=encrypt_text(details.get("device_name") or details.get("platform") or "Unknown device"),
        place_encrypted=encrypt_text(details.get("place") or "Unknown place"),
        ip_encrypted=encrypt_text(client_ip()),
        user_agent_encrypted=encrypt_text(request.headers.get("User-Agent") or details.get("user_agent") or "Unknown browser"),
    )
    db.session.add(audit)
    return audit


def branch_config(branch):
    config = as_json(branch.dashboard_config_json, {})
    config.setdefault("industry_settings", {})
    config["industry_settings"].setdefault("token_name_mode", "default")
    config["industry_settings"].setdefault("customer_name_slots", 3)
    config["industry_settings"].setdefault("role_labels", {})
    return config


def user_schema(branch):
    return as_json(branch.user_schema_json, [])


def serialize_user(user):
    return {
        "id": user.id,
        "user_code": user.user_code,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
        "address": user.address,
        "area": user.area,
        "city": user.city,
        "state": user.state,
        "pincode": user.pincode,
        "designation": user.designation,
        "emergency_contact": user.emergency_contact,
        "personal_details": user.personal_details,
        "industry_id": user.industry_id,
        "industry_name": user.industry.name if user.industry else None,
        "industry_type": user.industry.industry_type if user.industry else None,
        "branch_id": user.branch_id,
        "branch_name": user.branch.name if user.branch else None,
        "avatar_url": user.avatar_url,
        "avatar_preset": user.avatar_preset or "face-1",
        "industry_logo_url": user.industry.logo_url if user.industry else None,
        "industry_logo_preset": user.industry.logo_preset if user.industry else "logo-1",
        "must_reset_password": user.must_reset_password,
        "terms_accepted": bool(user.terms_accepted_at),
        "terms_text": SECURITY_TERMS_TEXT,
        "device_consent": user.device_consent,
        "device_consent_required": user.device_consent is None,
        "last_seen_at": user.last_seen_at.isoformat() + "Z" if user.last_seen_at else None,
        "is_online": is_online(user),
    }


def serialize_branch(branch):
    return {
        "id": branch.id,
        "industry_id": branch.industry_id,
        "industry_name": branch.industry.name,
        "name": branch.name,
        "details": branch.details,
        "branch_type": branch.branch_type,
        "other_type_name": branch.other_type_name,
        "address": branch.address,
        "area": branch.area,
        "city": branch.city,
        "state": branch.state,
        "pincode": branch.pincode,
        "latitude": branch.latitude,
        "longitude": branch.longitude,
        "logo_url": branch.industry.logo_url,
        "logo_preset": branch.industry.logo_preset or "logo-1",
        "dashboard_config": branch_config(branch),
        "user_schema": user_schema(branch),
    }


def serialize_admin_user_directory_entry(user):
    token_count = Token.query.filter_by(user_id=user.id).count()
    active_token_count = Token.query.filter(
        Token.user_id == user.id,
        Token.status.in_(ACTIVE_TOKEN_STATUSES),
    ).count()
    industry = user.industry
    branch = user.branch
    return {
        **serialize_user(user),
        "company": {
            "id": industry.id if industry else None,
            "name": industry.name if industry else None,
            "industry_type": industry.industry_type if industry else None,
            "other_type_name": industry.other_type_name if industry else None,
            "details": industry.details if industry else None,
        },
        "branch": {
            "id": branch.id if branch else None,
            "name": branch.name if branch else None,
            "branch_type": branch.branch_type if branch else None,
            "other_type_name": branch.other_type_name if branch else None,
            "details": branch.details if branch else None,
        },
        "work": {
            "role": user.role,
            "designation": user.designation,
            "must_reset_password": user.must_reset_password,
            "token_count": token_count,
            "active_token_count": active_token_count,
            "is_online": is_online(user),
            "last_seen_at": user.last_seen_at.isoformat() + "Z" if user.last_seen_at else None,
        },
        "details": {
            "phone": user.phone,
            "address": user.address,
            "area": user.area,
            "city": user.city,
            "state": user.state,
            "pincode": user.pincode,
            "emergency_contact": user.emergency_contact,
            "personal_details": user.personal_details,
            "created_at": user.created_at.isoformat() + "Z" if user.created_at else None,
        },
    }


def serialize_token(token):
    seconds_left = max(0, int((token.expires_at - datetime.utcnow()).total_seconds()))
    return {
        "token_id": token.id,
        "token_code": token.token_code,
        "token_number": token.token_number,
        "status": token.status,
        "user_id": token.user_id,
        "user_code": token.user.user_code,
        "user_name": token.user.name,
        "display_name": token.display_name or token.user.name,
        "name_mode": token.name_mode or "default",
        "user_email": token.user.email,
        "industry_id": token.industry_id,
        "industry_name": token.industry.name,
        "branch_id": token.branch_id,
        "branch_name": token.branch.name,
        "branch_config": branch_config(token.branch),
        "details": as_json(token.details_json, {}),
        "operator_name": token.operator.name if token.operator else None,
        "provider_name": token.provider.name if token.provider else None,
        "provider_id": token.provider_id,
        "ai_suggestion": token.ai_suggestion,
        "emergency_requested": bool(token.emergency_requested),
        "emergency_accepted": bool(token.emergency_accepted),
        "emergency_requested_at": token.emergency_requested_at.isoformat() + "Z" if token.emergency_requested_at else None,
        "emergency_accepted_at": token.emergency_accepted_at.isoformat() + "Z" if token.emergency_accepted_at else None,
        "expires_at": token.expires_at.isoformat() + "Z",
        "seconds_left": seconds_left,
        "created_at": token.created_at.isoformat() + "Z",
    }


def serialize_event_log(item):
    return {
        "id": item.id,
        "user_id": item.user_id,
        "user_name": item.user_name or (item.user.name if item.user else "System"),
        "user_role": item.user_role or (item.user.role if item.user else "system"),
        "industry_name": item.industry.name if item.industry else None,
        "branch_name": item.branch.name if item.branch else None,
        "token_code": item.token.token_code if item.token else None,
        "event_type": item.event_type,
        "message": item.message,
        "created_at": item.created_at.isoformat() + "Z",
    }


def serialize_password_reset_request(item):
    return {
        "id": item.id,
        "user_id": item.user_id,
        "requester_name": item.requester_name,
        "requester_email": item.requester_email,
        "requester_role": item.requester_role,
        "status": item.status,
        "message": item.admin_message,
        "generated_password": item.generated_password,
        "created_at": item.created_at.isoformat() + "Z",
        "decided_at": item.decided_at.isoformat() + "Z" if item.decided_at else None,
    }


def serialize_device_audit(item):
    name = decrypt_text(item.display_name_encrypted)
    return {
        "id": item.id,
        "user_id": item.user_id,
        "event_type": item.event_type or "consent",
        "display_name": name if item.consent_allowed else "Unknown user",
        "device_name": decrypt_text(item.device_name_encrypted) if item.consent_allowed else "Not shared",
        "place": decrypt_text(item.place_encrypted) if item.consent_allowed else "Not shared",
        "ip_address": decrypt_text(item.ip_encrypted) if item.consent_allowed else "Hidden",
        "browser": decrypt_text(item.user_agent_encrypted) if item.consent_allowed else "Hidden",
        "permission": "Allowed" if item.consent_allowed else "Not allowed",
        "created_at": item.created_at.isoformat() + "Z" if item.created_at else None,
    }


def serialize_user_security_log(user, audit=None):
    allowed = bool(user.device_consent)
    answered = user.device_consent is not None
    return {
        "id": user.id,
        "display_name": user.name if allowed else "Unknown user",
        "email": user.email if allowed else "Hidden",
        "role": user.role if allowed else "Hidden",
        "permission": "Allowed" if allowed else "Not allowed" if answered else "Not answered",
        "device_name": decrypt_text(audit.device_name_encrypted) if allowed and audit else "Not shared",
        "place": decrypt_text(audit.place_encrypted) if allowed and audit else "Not shared",
        "ip_address": decrypt_text(audit.ip_encrypted) if allowed and audit else "Hidden",
        "browser": decrypt_text(audit.user_agent_encrypted) if allowed and audit else "Hidden",
        "last_used_at": user.last_seen_at.isoformat() + "Z" if user.last_seen_at else None,
        "consent_at": user.device_consent_at.isoformat() + "Z" if user.device_consent_at else None,
        "created_at": user.created_at.isoformat() + "Z" if user.created_at else None,
    }


def estimated_wait(branch_id):
    waiting = Token.query.filter(
        Token.branch_id == branch_id, Token.status.in_(ACTIVE_TOKEN_STATUSES)
    ).count()
    return waiting * 5


def clean_suggestion_text(value, limit=160):
    text = " ".join(str(value or "").split())
    legacy_marker = " Check identity,"
    if legacy_marker in text:
        text = text.split(legacy_marker, 1)[0].rstrip(".,;:")
    text = text.replace(" route to .", ".").replace(" route to.", ".")
    if len(text) <= limit:
        return text
    clipped = text[:limit].rsplit(" ", 1)[0].rstrip(".,;:")
    return f"{clipped}..."


def make_ai_suggestion(token, provider_requirements=None):
    details = as_json(token.details_json, {})
    need = (
        details.get("need")
        or details.get("reason")
        or details.get("service")
        or details.get("purpose")
        or "requested service"
    )
    branch_type = token.branch.other_type_name or token.branch.branch_type
    previous = (
        Suggestion.query.join(Token, Token.id == Suggestion.token_id)
        .filter(Token.user_id == token.user_id, Token.id != token.id)
        .order_by(Suggestion.created_at.desc())
        .first()
    )
    provider_text = (provider_requirements or "").strip()
    action_source = clean_suggestion_text(provider_text or need, 180)
    previous_note = clean_suggestion_text(previous.suggestion_text, 140) if previous else ""
    parts = [
        f"Suggested action: {action_source}.",
        f"Customer request: {clean_suggestion_text(need, 120)}.",
        f"Service area: {branch_type}.",
    ]
    if previous_note:
        parts.append(f"Previous note: {previous_note}.")
    parts.append("Complete the service with a clear final note for the user.")
    return " ".join(parts)


def require_same_industry(user, industry_id):
    return user.role == "main_admin" or user.industry_id == industry_id


def nominatim_lookup(params):
    query = urllib.parse.urlencode(params)
    request_url = f"https://nominatim.openstreetmap.org/search?{query}&format=json&addressdetails=1&limit=1"
    request_obj = urllib.request.Request(
        request_url,
        headers={"User-Agent": "AIQueueApp/1.0 contact:admin@queue.local"},
    )
    with urllib.request.urlopen(request_obj, timeout=12) as response:
        return json.loads(response.read().decode("utf-8"))


def normalize_nominatim_address(item):
    address = item.get("address") or {}
    area = (
        address.get("suburb")
        or address.get("neighbourhood")
        or address.get("quarter")
        or address.get("city_district")
        or address.get("county")
        or address.get("state_district")
        or ""
    )
    city = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("municipality")
        or address.get("state_district")
        or address.get("county")
        or ""
    )
    state = address.get("state") or address.get("region") or ""
    pincode = address.get("postcode") or ""
    return {
        "display_name": item.get("display_name"),
        "address": item.get("display_name"),
        "area": area,
        "city": city,
        "state": state,
        "pincode": pincode,
        "latitude": float(item["lat"]) if item.get("lat") else None,
        "longitude": float(item["lon"]) if item.get("lon") else None,
    }


@app.route("/health")
def health():
    return jsonify({"success": True, "service": "ai-queue-backend"}), 200


@app.route("/api/maps/geocode")
@login_required
def geocode_address():
    address = (request.args.get("address") or "").strip()
    area = (request.args.get("area") or "").strip()
    pincode = (request.args.get("pincode") or "").strip()
    city = (request.args.get("city") or "").strip()
    state = (request.args.get("state") or "").strip()
    if not any((address, area, pincode, city, state)):
        return jsonify({"success": False, "error": "Area, city, state, or pincode is required"}), 400
    try:
        results = []
        if pincode:
            results = nominatim_lookup({"postalcode": pincode, "country": "India"})
        if not results:
            query_text = ", ".join(part for part in (address, area, city, state, pincode, "India") if part)
            results = nominatim_lookup({"q": query_text})
    except Exception as exc:
        return jsonify({"success": False, "error": f"Map lookup failed: {exc}"}), 502
    if not results:
        return jsonify({"success": False, "error": "No location result found"}), 404
    return jsonify({"success": True, "location": normalize_nominatim_address(results[0])}), 200


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    if not data.get("name") or not email or not data.get("password"):
        return jsonify({"success": False, "error": "Name, email, and password are required"}), 400
    if not data.get("terms_accepted"):
        return jsonify({"success": False, "error": "Please accept the terms and data security policy"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"success": False, "error": "Email already registered"}), 400

    user = User(
        name=data["name"].strip(),
        email=email,
        user_code=generate_user_code(),
        phone=data.get("phone"),
        role="user",
        terms_accepted_at=datetime.utcnow(),
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify({"success": True, "user": serialize_user(user)}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(data.get("password") or ""):
        return jsonify({"success": False, "error": "Invalid email or password"}), 401
    session["user_id"] = user.id
    session["user_role"] = user.role
    record_device_audit(user, data.get("device_details") or {}, event_type="login")
    record_event("login", f"{user.name} logged in.", user=user)
    db.session.commit()
    return jsonify({"success": True, "user": serialize_user(user)}), 200


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    user = current_user()
    if user:
        record_event("logout", f"{user.name} logged out.", user=user)
        db.session.commit()
    session.clear()
    return jsonify({"success": True}), 200


@app.route("/api/auth/me")
@login_required
def me():
    return jsonify({"success": True, "user": serialize_user(current_user())}), 200


@app.route("/api/security/terms")
def security_terms():
    return jsonify({"success": True, "terms": SECURITY_TERMS_TEXT}), 200


@app.route("/api/security/device-consent", methods=["POST"])
@login_required
def device_consent():
    user = current_user()
    data = request.get_json() or {}
    allow = bool(data.get("allow"))
    details = data.get("device_details") or {}
    now = datetime.utcnow()
    if not user.terms_accepted_at:
        user.terms_accepted_at = now
    user.device_consent = allow
    user.device_consent_at = now

    record_device_audit(user, details, consent_allowed=allow, event_type="consent")
    db.session.commit()
    return jsonify({"success": True, "user": serialize_user(user)}), 200


@app.route("/api/admin/secret/devices")
@login_required
@role_required("main_admin")
def admin_secret_devices():
    if not session.get("secret_unlocked"):
        return jsonify({"success": False, "error": "Secret password required"}), 403
    audits = DeviceAudit.query.order_by(DeviceAudit.created_at.desc()).limit(200).all()
    latest_audits = {}
    for item in DeviceAudit.query.filter(DeviceAudit.user_id.isnot(None)).order_by(DeviceAudit.created_at.desc()).limit(1000).all():
        latest_audits.setdefault(item.user_id, item)
    users = User.query.order_by(User.created_at.desc()).all()
    users.sort(key=lambda item: item.last_seen_at or item.created_at or datetime.min, reverse=True)
    return jsonify(
        {
            "success": True,
            "security": {
                "terms": SECURITY_TERMS_TEXT,
                "encryption": "Device audit fields are encrypted at rest with an app-level encryption key and verified before display.",
                "headers": ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"],
            },
            "devices": [serialize_device_audit(item) for item in audits],
            "user_logs": [serialize_user_security_log(item, latest_audits.get(item.id)) for item in users],
        }
    ), 200


@app.route("/api/admin/secret/unlock", methods=["POST"])
@login_required
@role_required("main_admin")
def admin_secret_unlock():
    user = current_user()
    data = request.get_json() or {}
    if not user.check_secret_password(data.get("password") or ""):
        return jsonify({"success": False, "error": "Invalid secret password"}), 403
    session["secret_unlocked"] = True
    return admin_secret_devices()


@app.route("/api/admin/secret/password", methods=["PUT"])
@login_required
@role_required("main_admin")
def change_secret_password():
    user = current_user()
    data = request.get_json() or {}
    current_password = data.get("current_secret_password") or ""
    new_password = data.get("new_secret_password") or ""
    if not user.check_secret_password(current_password):
        return jsonify({"success": False, "error": "Current secret password is incorrect"}), 400
    if len(new_password) < 4:
        return jsonify({"success": False, "error": "New secret password must be at least 4 characters"}), 400
    user.set_secret_password(new_password)
    session.pop("secret_unlocked", None)
    db.session.commit()
    return jsonify({"success": True, "message": "Secret password updated"}), 200


@app.route("/api/auth/reset-password", methods=["POST"])
@login_required
def reset_password():
    data = request.get_json() or {}
    user = current_user()
    if not user.check_password(data.get("current_password") or ""):
        return jsonify({"success": False, "error": "Current password is incorrect"}), 400
    if not data.get("new_password"):
        return jsonify({"success": False, "error": "New password is required"}), 400
    user.set_password(data["new_password"])
    user.must_reset_password = False
    db.session.commit()
    return jsonify({"success": True, "message": "Password updated"}), 200


@app.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(
            {
                "success": True,
                "message": "If that email exists, a password reset link has been sent.",
            }
        ), 200

    PasswordResetToken.query.filter_by(user_id=user.id, used_at=None).update(
        {PasswordResetToken.used_at: datetime.utcnow()}
    )
    token = PasswordResetToken(
        user_id=user.id,
        token=generate_reset_token(),
        expires_at=datetime.utcnow() + timedelta(minutes=30),
    )
    db.session.add(token)
    db.session.commit()

    reset_url = f"{FRONTEND_URL}/?reset_token={token.token}"
    email_sent = send_password_reset_email(user, reset_url)
    response = {
        "success": True,
        "message": "Password reset link sent to the account email.",
        "email_sent": email_sent,
    }
    if not email_sent and app.debug:
        response["reset_url"] = reset_url
    return jsonify(response), 200


@app.route("/api/auth/request-default-password", methods=["POST"])
@login_required
def request_default_password():
    user = current_user()
    if user.role == "main_admin":
        return jsonify({"success": False, "error": "Main admin cannot request admin approval from this page"}), 400

    if user.role == "industry_admin":
        admin = User.query.filter_by(role="main_admin").order_by(User.id.asc()).first()
    else:
        admin = None
        if user.industry and user.industry.admin_id:
            admin = db.session.get(User, user.industry.admin_id)

    if not admin:
        return jsonify({"success": False, "error": "Admin account not found for this reset request"}), 404

    pending = PasswordResetRequest.query.filter_by(user_id=user.id, status="pending").first()
    if pending:
        return jsonify({"success": True, "message": "A password reset request is already pending."}), 200

    item = PasswordResetRequest(
        user_id=user.id,
        admin_id=admin.id,
        requester_name=user.name,
        requester_email=user.email,
        requester_role=user.role,
    )
    db.session.add(item)
    create_notification(
        admin.id,
        f"{user.name} requested a default password reset.",
        "password_reset_request",
    )
    db.session.commit()
    return jsonify({"success": True, "message": "Password reset request sent to admin."}), 201


@app.route("/api/auth/reset-password/<token>", methods=["POST"])
def reset_password_with_token(token):
    data = request.get_json() or {}
    new_password = data.get("new_password") or ""
    confirm_password = data.get("confirm_password") or ""
    if len(new_password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters"}), 400
    if new_password != confirm_password:
        return jsonify({"success": False, "error": "Passwords do not match"}), 400

    reset_token = PasswordResetToken.query.filter_by(token=token, used_at=None).first()
    if not reset_token or reset_token.expires_at < datetime.utcnow():
        return jsonify({"success": False, "error": "Reset link is invalid or expired"}), 400

    user = db.session.get(User, reset_token.user_id)
    if not user:
        return jsonify({"success": False, "error": "Account no longer exists"}), 404

    user.set_password(new_password)
    user.must_reset_password = False
    reset_token.used_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"success": True, "message": "Password updated. You can sign in now."}), 200


@app.route("/api/profile", methods=["PUT"])
@login_required
def update_profile():
    user = current_user()
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    if not name:
        return jsonify({"success": False, "error": "Name is required"}), 400
    user.name = name
    user.phone = phone
    user.address = (data.get("address") or "").strip() or None
    user.area = (data.get("area") or "").strip() or None
    user.city = (data.get("city") or "").strip() or None
    user.state = (data.get("state") or "").strip() or None
    user.pincode = (data.get("pincode") or "").strip() or None
    user.designation = (data.get("designation") or "").strip() or None
    user.emergency_contact = (data.get("emergency_contact") or "").strip() or None
    user.personal_details = (data.get("personal_details") or "").strip() or None
    user.avatar_preset = (data.get("avatar_preset") or "face-1").strip()
    user.avatar_url = (data.get("avatar_url") or "").strip() or None
    if user.role in ("industry_admin", "main_admin") and user.industry:
        user.industry.logo_preset = (data.get("industry_logo_preset") or "logo-1").strip()
        user.industry.logo_url = (data.get("industry_logo_url") or "").strip() or None
    db.session.commit()
    return jsonify({"success": True, "user": serialize_user(user)}), 200


@app.route("/api/admin/password-reset-requests")
@login_required
@role_required("main_admin", "industry_admin")
def list_password_reset_requests():
    user = current_user()
    query = PasswordResetRequest.query
    if user.role == "main_admin":
        query = query.filter(
            (PasswordResetRequest.admin_id == user.id)
            | (PasswordResetRequest.requester_role == "industry_admin")
        )
    else:
        query = query.filter_by(admin_id=user.id)
    items = query.order_by(PasswordResetRequest.created_at.desc()).all()
    return jsonify(
        {"success": True, "requests": [serialize_password_reset_request(item) for item in items]}
    ), 200


@app.route("/api/admin/password-reset-requests/<int:request_id>/decision", methods=["POST"])
@login_required
@role_required("main_admin", "industry_admin")
def decide_password_reset_request(request_id):
    admin = current_user()
    data = request.get_json() or {}
    decision = data.get("decision")
    item = db.session.get(PasswordResetRequest, request_id)
    if not item or item.status != "pending":
        return jsonify({"success": False, "error": "Pending reset request not found"}), 404
    if decision not in ("approve", "reject"):
        return jsonify({"success": False, "error": "Decision must be approve or reject"}), 400
    if item.admin_id != admin.id and not (admin.role == "main_admin" and item.requester_role == "industry_admin"):
        return jsonify({"success": False, "error": "Reset request belongs to another admin"}), 403

    target = db.session.get(User, item.user_id)
    if not target:
        return jsonify({"success": False, "error": "Account no longer exists"}), 404

    item.status = "approved" if decision == "approve" else "rejected"
    item.admin_message = data.get("message")
    item.decided_at = datetime.utcnow()

    if decision == "approve":
        password = generate_password()
        target.set_password(password)
        target.must_reset_password = True
        item.generated_password = password
        create_notification(
            target.id,
            "Your password reset request was approved. Contact your admin for the default password.",
            "password_reset_approved",
        )
        send_default_password_email(target, password)
    else:
        create_notification(
            target.id,
            "Your password reset request was rejected. Contact your admin for help.",
            "password_reset_rejected",
        )

    db.session.commit()
    return jsonify({"success": True, "request": serialize_password_reset_request(item)}), 200


@app.route("/api/access-requests", methods=["POST"])
def create_access_request():
    data = request.get_json() or {}
    required = ("admin_name", "admin_email", "industry_name", "industry_type")
    if any(not data.get(field) for field in required):
        return jsonify({"success": False, "error": "Admin and industry details are required"}), 400
    if data["industry_type"] not in INDUSTRY_TYPES:
        return jsonify({"success": False, "error": "Invalid industry type"}), 400
    if data["industry_type"] == "other" and not data.get("other_type_name"):
        return jsonify({"success": False, "error": "Other type name is required"}), 400

    email = data["admin_email"].strip().lower()
    if User.query.filter_by(email=email).first():
        return jsonify({"success": False, "error": "An account already exists for this email"}), 400
    pending = AccessRequest.query.filter_by(admin_email=email, status="pending").first()
    if pending:
        return jsonify({"success": False, "error": "A pending request already exists"}), 400

    access_request = AccessRequest(
        admin_name=data["admin_name"].strip(),
        admin_email=email,
        admin_phone=data.get("admin_phone"),
        industry_name=data["industry_name"].strip(),
        industry_type=data["industry_type"],
        other_type_name=data.get("other_type_name"),
        details=data.get("details"),
    )
    db.session.add(access_request)
    for admin in User.query.filter_by(role="main_admin").all():
        create_notification(
            admin.id,
            f"New industry access request from {access_request.industry_name}",
            "access_request",
        )
    db.session.commit()
    return jsonify({"success": True, "request": {"id": access_request.id}}), 201


@app.route("/api/admin/access-requests")
@login_required
@role_required("main_admin")
def list_access_requests():
    requests = AccessRequest.query.order_by(AccessRequest.created_at.desc()).all()
    return jsonify(
        {
            "success": True,
            "requests": [
                {
                    "id": item.id,
                    "admin_name": item.admin_name,
                    "admin_email": item.admin_email,
                    "admin_phone": item.admin_phone,
                    "industry_name": item.industry_name,
                    "industry_type": item.industry_type,
                    "other_type_name": item.other_type_name,
                    "details": item.details,
                    "status": item.status,
                    "message": item.main_admin_message,
                    "generated_password": item.generated_password,
                    "created_at": item.created_at.isoformat() + "Z",
                    "decided_at": item.decided_at.isoformat() + "Z" if item.decided_at else None,
                }
                for item in requests
            ],
        }
    ), 200


@app.route("/api/admin/users/directory")
@login_required
@role_required("main_admin", "industry_admin")
def admin_user_directory():
    user = current_user()
    query = User.query
    industries_query = Industry.query
    branches_query = Branch.query
    if user.role == "industry_admin":
        query = query.filter((User.industry_id == user.industry_id) | (User.id == user.id))
        industries_query = industries_query.filter_by(id=user.industry_id)
        branches_query = branches_query.filter_by(industry_id=user.industry_id)
    users = query.order_by(User.role.asc(), User.created_at.desc()).all()
    industries = industries_query.order_by(Industry.name.asc()).all()
    branches = branches_query.order_by(Branch.name.asc()).all()
    roles = ("main_admin", "industry_admin", "queue_operator", "service_provider", "user")
    grouped = {role: [] for role in roles}
    for item in users:
        grouped.setdefault(item.role, []).append(serialize_admin_user_directory_entry(item))
    return jsonify(
        {
            "success": True,
            "users": [serialize_admin_user_directory_entry(item) for item in users],
            "grouped": grouped,
            "summary": {
                "total_users": len(users),
                "companies": len(industries),
                "branches": len(branches),
                "roles": {role: len(grouped.get(role, [])) for role in grouped},
            },
        }
    ), 200


@app.route("/api/admin/event-logs")
@login_required
@role_required("main_admin")
def admin_event_logs():
    query_text = (request.args.get("q") or "").strip().lower()
    logs = EventLog.query.order_by(EventLog.created_at.desc()).limit(500).all()
    if query_text:
        logs = [
            item for item in logs
            if any(
                query_text in str(value or "").lower()
                for value in (
                    item.user_name,
                    item.user_role,
                    item.event_type,
                    item.message,
                    item.industry.name if item.industry else "",
                    item.branch.name if item.branch else "",
                    item.token.token_code if item.token else "",
                )
            )
        ]
    return jsonify({"success": True, "logs": [serialize_event_log(item) for item in logs]}), 200


@app.route("/api/industry/users/search")
@login_required
@role_required("industry_admin", "queue_operator", "service_provider")
def industry_user_search():
    user = current_user()
    query_text = (request.args.get("q") or "").strip().lower()
    if len(query_text) < 2:
        return jsonify({"success": True, "users": []}), 200

    same_company_user_ids = [
        row[0]
        for row in Token.query.filter_by(industry_id=user.industry_id)
        .with_entities(Token.user_id)
        .distinct()
        .all()
    ]
    matching_users = (
        User.query.filter(
            User.role == "user",
            (User.industry_id == user.industry_id) | (User.id.in_(same_company_user_ids)),
        )
        .order_by(User.name.asc())
        .all()
    )
    results = []
    for item in matching_users:
        values = [
            item.user_code,
            item.name,
            item.email,
            item.phone,
            item.area,
            item.city,
            item.state,
            item.pincode,
            item.branch.name if item.branch else "",
        ]
        if any(query_text in str(value or "").lower() for value in values):
            results.append(serialize_admin_user_directory_entry(item))
    return jsonify({"success": True, "users": results[:20]}), 200


@app.route("/api/admin/access-requests/<int:request_id>/decision", methods=["POST"])
@login_required
@role_required("main_admin")
def decide_access_request(request_id):
    data = request.get_json() or {}
    decision = data.get("decision")
    access_request = db.session.get(AccessRequest, request_id)
    if not access_request or access_request.status != "pending":
        return jsonify({"success": False, "error": "Pending request not found"}), 404
    if decision not in ("approve", "reject"):
        return jsonify({"success": False, "error": "Decision must be approve or reject"}), 400

    access_request.status = "approved" if decision == "approve" else "rejected"
    access_request.main_admin_message = data.get("message")
    access_request.decided_at = datetime.utcnow()

    if decision == "approve":
        password = generate_password()
        admin = User(
            name=access_request.admin_name,
            email=access_request.admin_email,
            user_code=generate_user_code(),
            phone=access_request.admin_phone,
            role="industry_admin",
            must_reset_password=True,
        )
        admin.set_password(password)
        industry = Industry(
            name=access_request.industry_name,
            industry_type=access_request.industry_type,
            other_type_name=access_request.other_type_name,
            details=access_request.details,
            admin=admin,
            terms=(
                "Industry admin is responsible for staff access, branch data, "
                "token verification, privacy, and all user-facing queue content."
            ),
        )
        db.session.add(admin)
        db.session.add(industry)
        db.session.flush()
        admin.industry_id = industry.id
        access_request.industry_id = industry.id
        access_request.generated_password = password
        create_notification(
            admin.id,
            "Your industry access request was approved. Please reset the default password.",
            "access_approved",
        )
    db.session.commit()
    return jsonify(
        {
            "success": True,
            "request": {
                "id": access_request.id,
                "status": access_request.status,
                "generated_password": access_request.generated_password,
            },
        }
    ), 200


@app.route("/api/catalog")
def catalog():
    industries = Industry.query.order_by(Industry.name).all()
    branches = Branch.query.order_by(Branch.name).all()
    return jsonify(
        {
            "success": True,
            "industries": [
                {
                    "id": item.id,
                    "name": item.name,
                    "industry_type": item.industry_type,
                    "other_type_name": item.other_type_name,
                }
                for item in industries
            ],
            "branches": [serialize_branch(branch) for branch in branches],
        }
    ), 200


@app.route("/api/industry/branches", methods=["GET", "POST"])
@login_required
@role_required("industry_admin")
def industry_branches():
    user = current_user()
    if request.method == "GET":
        branches = Branch.query.filter_by(industry_id=user.industry_id).order_by(Branch.created_at.desc()).all()
        return jsonify({"success": True, "branches": [serialize_branch(branch) for branch in branches]}), 200

    data = request.get_json() or {}
    if not data.get("name") or not data.get("branch_type"):
        return jsonify({"success": False, "error": "Branch name and type are required"}), 400
    if data["branch_type"] == "other" and not data.get("other_type_name"):
        return jsonify({"success": False, "error": "Other type name is required"}), 400

    branch = Branch(
        industry_id=user.industry_id,
        name=data["name"].strip(),
        details=data.get("details"),
        branch_type=data["branch_type"],
        other_type_name=data.get("other_type_name"),
        address=(data.get("address") or "").strip() or None,
        area=(data.get("area") or "").strip() or None,
        city=(data.get("city") or "").strip() or None,
        state=(data.get("state") or "").strip() or None,
        pincode=(data.get("pincode") or "").strip() or None,
        latitude=float(data["latitude"]) if data.get("latitude") not in (None, "") else None,
        longitude=float(data["longitude"]) if data.get("longitude") not in (None, "") else None,
        dashboard_config_json=dumps(data.get("dashboard_config") or {}),
        user_schema_json=dumps(data.get("user_schema") or []),
    )
    db.session.add(branch)
    db.session.commit()
    return jsonify({"success": True, "branch": serialize_branch(branch)}), 201


@app.route("/api/industry/branches/<int:branch_id>", methods=["PUT"])
@login_required
@role_required("industry_admin")
def update_industry_branch(branch_id):
    user = current_user()
    branch = db.session.get(Branch, branch_id)
    if not branch or branch.industry_id != user.industry_id:
        return jsonify({"success": False, "error": "Branch not found"}), 404

    data = request.get_json() or {}
    if not data.get("name") or not data.get("branch_type"):
        return jsonify({"success": False, "error": "Branch name and type are required"}), 400
    if data["branch_type"] == "other" and not data.get("other_type_name"):
        return jsonify({"success": False, "error": "Other type name is required"}), 400

    branch.name = data["name"].strip()
    branch.details = data.get("details")
    branch.branch_type = data["branch_type"]
    branch.other_type_name = data.get("other_type_name")
    branch.address = (data.get("address") or "").strip() or None
    branch.area = (data.get("area") or "").strip() or None
    branch.city = (data.get("city") or "").strip() or None
    branch.state = (data.get("state") or "").strip() or None
    branch.pincode = (data.get("pincode") or "").strip() or None
    branch.latitude = float(data["latitude"]) if data.get("latitude") not in (None, "") else None
    branch.longitude = float(data["longitude"]) if data.get("longitude") not in (None, "") else None
    branch.dashboard_config_json = dumps(data.get("dashboard_config") or {})
    branch.user_schema_json = dumps(data.get("user_schema") or [])
    db.session.commit()
    branches = Branch.query.filter_by(industry_id=user.industry_id).order_by(Branch.name.asc()).all()
    return jsonify({"success": True, "branch": serialize_branch(branch), "branches": [serialize_branch(item) for item in branches]}), 200


@app.route("/api/industry/settings", methods=["GET", "PUT"])
@login_required
@role_required("industry_admin")
def industry_settings():
    user = current_user()
    branches = Branch.query.filter_by(industry_id=user.industry_id).order_by(Branch.name.asc()).all()
    if request.method == "GET":
        return jsonify({"success": True, "branches": [serialize_branch(branch) for branch in branches]}), 200

    data = request.get_json() or {}
    settings = data.get("industry_settings") or {}
    allowed = {
        "token_name_mode": settings.get("token_name_mode"),
        "customer_name_slots": int(settings.get("customer_name_slots") or 3),
        "role_labels": settings.get("role_labels") or {},
    }
    allowed["token_name_mode"] = "customer" if allowed["token_name_mode"] == "customer" else "default"
    allowed["customer_name_slots"] = min(3, max(1, allowed["customer_name_slots"]))
    allowed["role_labels"] = {
        role: str(label or "").strip()
        for role, label in allowed["role_labels"].items()
        if role in ("industry_admin", "queue_operator", "service_provider") and str(label or "").strip()
    }

    branch_id = data.get("branch_id")
    target_branches = branches
    if branch_id:
        target = db.session.get(Branch, int(branch_id))
        if not target or target.industry_id != user.industry_id:
            return jsonify({"success": False, "error": "Branch not found"}), 404
        target_branches = [target]

    for branch in target_branches:
        config = branch_config(branch)
        config["industry_settings"] = {**config.get("industry_settings", {}), **allowed}
        branch.dashboard_config_json = dumps(config)
    db.session.commit()
    return jsonify({"success": True, "branches": [serialize_branch(branch) for branch in branches]}), 200


@app.route("/api/industry/staff", methods=["GET", "POST"])
@login_required
@role_required("industry_admin")
def industry_staff():
    user = current_user()
    if request.method == "GET":
        staff = (
            User.query.filter(
                User.industry_id == user.industry_id,
                User.role.in_(("queue_operator", "service_provider")),
            )
            .order_by(User.created_at.desc())
            .all()
        )
        return jsonify(
            {
                "success": True,
                "staff": [
                    {
                        **serialize_user(member),
                        "branch_name": member.branch.name if member.branch else None,
                    }
                    for member in staff
                ],
            }
        ), 200

    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    branch = db.session.get(Branch, int(data.get("branch_id") or 0))
    if not branch or branch.industry_id != user.industry_id:
        return jsonify({"success": False, "error": "Valid branch is required"}), 400
    if data.get("role") not in ("queue_operator", "service_provider"):
        return jsonify({"success": False, "error": "Invalid staff role"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"success": False, "error": "Email already exists"}), 400

    password = generate_password()
    staff = User(
        name=data.get("name", "").strip(),
        email=email,
        user_code=generate_user_code(),
        phone=data.get("phone"),
        address=(data.get("address") or "").strip() or None,
        area=(data.get("area") or "").strip() or None,
        city=(data.get("city") or "").strip() or None,
        state=(data.get("state") or "").strip() or None,
        pincode=(data.get("pincode") or "").strip() or None,
        designation=(data.get("designation") or "").strip() or None,
        emergency_contact=(data.get("emergency_contact") or "").strip() or None,
        personal_details=(data.get("personal_details") or "").strip() or None,
        role=data["role"],
        industry_id=user.industry_id,
        branch_id=branch.id,
        must_reset_password=True,
    )
    staff.set_password(password)
    db.session.add(staff)
    db.session.commit()
    return jsonify(
        {"success": True, "staff": {**serialize_user(staff), "generated_password": password}}
    ), 201


@app.route("/api/token", methods=["POST"])
@login_required
def generate_token():
    user = current_user()
    data = request.get_json() or {}
    branch = db.session.get(Branch, int(data.get("branch_id") or 0))
    if not branch:
        return jsonify({"success": False, "error": "Please select a valid place"}), 400

    details = data.get("details") or {}
    name_mode = (data.get("name_mode") or branch_config(branch).get("industry_settings", {}).get("token_name_mode") or "default").strip()
    customer_names = [
        str(name or "").strip()
        for name in (data.get("customer_names") or [])
        if str(name or "").strip()
    ][:3]
    display_name = user.name
    if name_mode == "customer" and customer_names:
        display_name = ", ".join(customer_names)
        details = {**details, "customer_names": customer_names}
    else:
        name_mode = "default"
    duplicate_key = f"{user.id}:{branch.industry_id}:{branch.id}:{normalize_details(details)}"
    existing = Token.query.filter(
        Token.user_id == user.id,
        Token.branch_id == branch.id,
        Token.status.in_(ACTIVE_TOKEN_STATUSES),
        Token.expires_at > datetime.utcnow(),
    ).first()
    if not existing:
        existing = Token.query.filter(
            Token.duplicate_key == duplicate_key,
            Token.status.in_(ACTIVE_TOKEN_STATUSES),
            Token.expires_at > datetime.utcnow(),
        ).first()
    if existing:
        return jsonify(
            {
                "success": False,
                "error": f"Duplicate request blocked. Active token {existing.token_code} is still valid.",
                "token": serialize_token(existing),
            }
        ), 400

    branch.last_token_number += 1
    token_code = f"{branch.branch_type[:3].upper()}-{branch.id}-{branch.last_token_number:04d}"
    token = Token(
        token_code=token_code,
        token_number=branch.last_token_number,
        user_id=user.id,
        industry_id=branch.industry_id,
        branch_id=branch.id,
        user=user,
        industry=branch.industry,
        branch=branch,
        status="verified",
        details_json=dumps(details),
        display_name=display_name,
        name_mode=name_mode,
        duplicate_key=duplicate_key,
        verified_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(minutes=TOKEN_TTL_MINUTES),
    )
    db.session.add(token)

    for operator in User.query.filter_by(role="queue_operator", branch_id=branch.id).all():
        create_notification(operator.id, f"New token {token_code} is verified automatically and ready for customer entry.", "token_requested")
    create_notification(
        user.id,
        f"Token {token_code} generated for {branch.industry.name} / {branch.name}.",
        "token_generated",
        token.id,
    )
    record_event("token_generated", f"{user.name} generated token {token_code}.", user=user, token=token)
    db.session.commit()
    return jsonify(
        {
            "success": True,
            "token": serialize_token(token),
            "waiting_time": estimated_wait(branch.id),
            "position": Token.query.filter(
                Token.branch_id == branch.id, Token.status.in_(ACTIVE_TOKEN_STATUSES)
            ).count(),
        }
    ), 201


@app.route("/api/queue/status")
def queue_status():
    branch_id = request.args.get("branch_id", type=int)
    if not branch_id:
        branch = Branch.query.order_by(Branch.created_at).first()
    else:
        branch = db.session.get(Branch, branch_id)
    if not branch:
        return jsonify(
            {
                "success": True,
                "current_token": 0,
                "last_token": 0,
                "waiting_count": 0,
                "estimated_waiting_time": 0,
                "next_tokens": [],
            }
        ), 200

    active = Token.query.filter(
        Token.branch_id == branch.id, Token.status.in_(ACTIVE_TOKEN_STATUSES)
    )
    next_tokens = active.order_by(Token.token_number).limit(5).all()
    return jsonify(
        {
            "success": True,
            "current_token": branch.current_token_number,
            "last_token": branch.last_token_number,
            "waiting_count": active.count(),
            "with_provider_count": Token.query.filter_by(branch_id=branch.id, status="allocated").count(),
            "estimated_waiting_time": estimated_wait(branch.id),
            "next_tokens": [serialize_token(token) for token in next_tokens],
            "is_active": True,
        }
    ), 200


@app.route("/api/operator/queue")
@login_required
@role_required("queue_operator", "industry_admin", "main_admin")
def operator_queue():
    user = current_user()
    query = Token.query
    providers_query = User.query.filter_by(role="service_provider")
    if user.role == "queue_operator":
        query = query.filter(Token.branch_id == user.branch_id)
        providers_query = providers_query.filter_by(branch_id=user.branch_id)
    elif user.role == "industry_admin":
        query = query.filter(Token.industry_id == user.industry_id)
        providers_query = providers_query.filter_by(industry_id=user.industry_id)
    tokens = (
        query.filter(Token.status.in_(OPERATOR_VISIBLE_TOKEN_STATUSES))
        .order_by(
            case((Token.status.in_(("customer_in", "allocated")), 0), else_=1),
            case((Token.emergency_accepted.is_(True), 0), else_=1),
            Token.token_number.asc(),
            Token.created_at.asc(),
        )
        .all()
    )
    providers = providers_query.order_by(User.name).all()
    return jsonify(
        {
            "success": True,
            "tokens": [serialize_token(token) for token in tokens],
            "providers": [serialize_user(provider) for provider in providers],
        }
    ), 200


@app.route("/api/operator/queue-history")
@login_required
@role_required("queue_operator", "industry_admin", "main_admin")
def operator_queue_history():
    user = current_user()
    query_text = (request.args.get("q") or "").strip().lower()
    date_from = (request.args.get("date_from") or "").strip()
    date_to = (request.args.get("date_to") or "").strip()

    query = Token.query
    if user.role == "queue_operator":
        query = query.filter(Token.branch_id == user.branch_id)
    elif user.role == "industry_admin":
        query = query.filter(Token.industry_id == user.industry_id)

    if date_from:
        try:
            query = query.filter(Token.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            return jsonify({"success": False, "error": "Invalid from date"}), 400
    if date_to:
        try:
            query = query.filter(Token.created_at < datetime.fromisoformat(date_to) + timedelta(days=1))
        except ValueError:
            return jsonify({"success": False, "error": "Invalid to date"}), 400

    tokens = query.order_by(Token.created_at.desc()).limit(200).all()
    if query_text:
        tokens = [
            token for token in tokens
            if any(
                query_text in str(value or "").lower()
                for value in (
                    token.token_code,
                    token.status,
                    token.user.user_code,
                    token.user.name,
                    token.user.email,
                    token.user.phone,
                    token.branch.name,
                    token.industry.name,
                    token.provider.name if token.provider else "",
                    token.operator.name if token.operator else "",
                )
            )
        ]

    return jsonify({"success": True, "tokens": [serialize_token(token) for token in tokens]}), 200


@app.route("/api/operator/tokens/<int:token_id>/action", methods=["POST"])
@login_required
@role_required("queue_operator", "industry_admin", "main_admin")
def operator_token_action(token_id):
    user = current_user()
    data = request.get_json() or {}
    token = db.session.get(Token, token_id)
    if not token or not require_same_industry(user, token.industry_id):
        return jsonify({"success": False, "error": "Token not found"}), 404
    if user.role == "queue_operator" and token.branch_id != user.branch_id:
        return jsonify({"success": False, "error": "Token belongs to another branch"}), 403
    if token.expires_at <= datetime.utcnow() and token.status in ACTIVE_TOKEN_STATUSES:
        token.status = "expired"
        db.session.commit()
        return jsonify({"success": False, "error": "Token expired before verification"}), 400

    action = data.get("action")
    if action == "verify":
        token.status = "verified"
        token.operator_id = user.id
        token.verified_at = datetime.utcnow()
        create_notification(token.user_id, f"{token.token_code} verified. Please be ready.", "token_verified", token.id)
        record_event("token_verified", f"{token.token_code} verified by {user.name}.", user=user, token=token)
    elif action == "customer_in":
        if token.status not in ("requested", "verified"):
            return jsonify({"success": False, "error": "Customer entry is only allowed before allocation"}), 400
        token.status = "customer_in"
        token.operator_id = user.id
        token.customer_in_at = datetime.utcnow()
        token.branch.current_token_number = max(token.branch.current_token_number, token.token_number)
        create_notification(token.user_id, f"{token.token_code} customer entry confirmed.", "customer_in", token.id)
        record_event("customer_in", f"{token.token_code} marked customer in by {user.name}.", user=user, token=token)
    elif action == "allocate":
        if token.status != "customer_in":
            return jsonify({"success": False, "error": "Mark customer in before allocating a provider"}), 400
        provider = db.session.get(User, int(data.get("provider_id") or 0))
        if not provider or provider.role != "service_provider" or provider.industry_id != token.industry_id:
            return jsonify({"success": False, "error": "Valid service provider is required"}), 400
        token.status = "allocated"
        token.provider_id = provider.id
        token.operator_id = user.id
        create_notification(token.user_id, f"{token.token_code} allocated to {provider.name}.", "provider_allocated", token.id)
        record_event("provider_allocated", f"{token.token_code} allocated to {provider.name} by {user.name}.", user=user, token=token)
    elif action == "reject":
        token.status = "rejected"
        token.emergency_requested = False
        token.emergency_accepted = False
        token.completed_at = datetime.utcnow()
        create_notification(token.user_id, f"{token.token_code} was rejected by queue control.", "token_rejected", token.id)
        record_event("token_rejected", f"{token.token_code} rejected by {user.name}.", user=user, token=token)
    elif action == "cancel":
        token.status = "cancelled"
        token.emergency_requested = False
        token.emergency_accepted = False
        token.completed_at = datetime.utcnow()
        create_notification(token.user_id, f"{token.token_code} is cancelled.", "token_cancelled", token.id)
        if token.provider_id:
            create_notification(token.provider_id, f"{token.token_code} is cancelled.", "token_cancelled", token.id)
        record_event("token_cancelled", f"{token.token_code} cancelled by {user.name}.", user=user, token=token)
    elif action == "accept_emergency":
        if not token.emergency_requested:
            return jsonify({"success": False, "error": "Emergency was not requested for this token"}), 400
        if token.status not in ("requested", "verified"):
            return jsonify({"success": False, "error": "Emergency can only reorder waiting tokens"}), 400
        token.emergency_accepted = True
        token.emergency_accepted_at = datetime.utcnow()
        token.operator_id = user.id
        create_notification(token.user_id, f"{token.token_code} emergency request accepted.", "emergency_accepted", token.id)
        record_event("emergency_accepted", f"{token.token_code} emergency accepted by {user.name}.", user=user, token=token)
    elif action == "cancel_emergency":
        token.emergency_requested = False
        token.emergency_accepted = False
        token.emergency_requested_at = None
        token.emergency_accepted_at = None
        create_notification(token.user_id, f"{token.token_code} emergency request cancelled.", "emergency_cancelled", token.id)
        record_event("emergency_cancelled", f"{token.token_code} emergency cancelled by {user.name}.", user=user, token=token)
    else:
        return jsonify({"success": False, "error": "Unknown token action"}), 400

    db.session.commit()
    return jsonify({"success": True, "token": serialize_token(token)}), 200


@app.route("/api/provider/tokens")
@login_required
@role_required("service_provider", "industry_admin", "main_admin")
def provider_tokens():
    user = current_user()
    query = Token.query.filter(Token.status.in_(("allocated", "customer_in")))
    if user.role == "service_provider":
        query = query.filter(Token.provider_id == user.id)
    elif user.role == "industry_admin":
        query = query.filter(Token.industry_id == user.industry_id)
    tokens = query.order_by(Token.created_at.asc()).all()
    return jsonify({"success": True, "tokens": [serialize_token(token) for token in tokens]}), 200


@app.route("/api/provider/tokens/<int:token_id>/ai-suggestion", methods=["POST"])
@login_required
@role_required("service_provider", "industry_admin", "main_admin")
def provider_ai_suggestion(token_id):
    user = current_user()
    data = request.get_json() or {}
    token = db.session.get(Token, token_id)
    if not token or not require_same_industry(user, token.industry_id):
        return jsonify({"success": False, "error": "Token not found"}), 404
    if user.role == "service_provider" and token.provider_id != user.id:
        return jsonify({"success": False, "error": "Token is not allocated to you"}), 403
    token.ai_suggestion = make_ai_suggestion(token, data.get("provider_requirements"))
    db.session.commit()
    return jsonify({"success": True, "suggestion": token.ai_suggestion}), 200


@app.route("/api/provider/tokens/<int:token_id>/suggestion", methods=["POST"])
@login_required
@role_required("service_provider", "industry_admin", "main_admin")
def provider_complete(token_id):
    user = current_user()
    data = request.get_json() or {}
    token = db.session.get(Token, token_id)
    if not token or not require_same_industry(user, token.industry_id):
        return jsonify({"success": False, "error": "Token not found"}), 404
    if user.role == "service_provider" and token.provider_id != user.id:
        return jsonify({"success": False, "error": "Token is not allocated to you"}), 403

    selected_items = data.get("selected_items") or []
    prices = [float(item.get("price") or 0) for item in selected_items]
    total = sum(prices)
    aggregates = {
        "total": total,
        "average": total / len(prices) if prices else 0,
        "count": len(prices),
        "min": min(prices) if prices else 0,
        "max": max(prices) if prices else 0,
    }
    suggestion = Suggestion(
        token_id=token.id,
        provider_id=user.id,
        suggestion_text=data.get("suggestion_text") or token.ai_suggestion or "Service completed.",
        selected_items_json=dumps(selected_items),
        aggregates_json=dumps(aggregates),
    )
    token.status = "completed"
    token.completed_at = datetime.utcnow()
    db.session.add(suggestion)
    create_notification(token.user_id, f"Service completed for {token.token_code}.", "service_completed", token.id)
    record_event("service_completed", f"{token.token_code} completed by {user.name}.", user=user, token=token)
    db.session.commit()
    return jsonify(
        {
            "success": True,
            "suggestion": {
                "id": suggestion.id,
                "suggestion_text": suggestion.suggestion_text,
                "selected_items": selected_items,
                "aggregates": aggregates,
            },
        }
    ), 200


@app.route("/api/user/my-tokens")
@login_required
def my_tokens():
    user = current_user()
    tokens = Token.query.filter_by(user_id=user.id).order_by(Token.created_at.desc()).limit(30).all()
    return jsonify({"success": True, "tokens": [serialize_token(token) for token in tokens]}), 200


@app.route("/api/user/tokens/<int:token_id>/cancel", methods=["POST"])
@login_required
def cancel_my_token(token_id):
    user = current_user()
    token = db.session.get(Token, token_id)
    if not token or token.user_id != user.id:
        return jsonify({"success": False, "error": "Token not found"}), 404
    if token.status not in ACTIVE_TOKEN_STATUSES:
        return jsonify({"success": False, "error": f"Token is already {token.status}"}), 400

    token.status = "cancelled"
    token.emergency_requested = False
    token.emergency_accepted = False
    token.completed_at = datetime.utcnow()
    create_notification(user.id, f"{token.token_code} is cancelled.", "token_cancelled", token.id)
    for operator in User.query.filter_by(role="queue_operator", branch_id=token.branch_id).all():
        create_notification(operator.id, f"{token.token_code} is cancelled by the customer.", "token_cancelled", token.id)
    if token.provider_id:
        create_notification(token.provider_id, f"{token.token_code} is cancelled by the customer.", "token_cancelled", token.id)
    record_event("token_cancelled", f"{user.name} cancelled token {token.token_code}.", user=user, token=token)
    db.session.commit()
    return jsonify({"success": True, "token": serialize_token(token)}), 200


@app.route("/api/user/tokens/<int:token_id>/emergency", methods=["POST"])
@login_required
def emergency_my_token(token_id):
    user = current_user()
    data = request.get_json() or {}
    action = data.get("action")
    token = db.session.get(Token, token_id)
    if not token or token.user_id != user.id:
        return jsonify({"success": False, "error": "Token not found"}), 404
    if token.status not in ("requested", "verified"):
        return jsonify({"success": False, "error": "Emergency can only be requested before customer entry"}), 400

    if action == "request":
        token.emergency_requested = True
        token.emergency_requested_at = datetime.utcnow()
        token.emergency_accepted = False
        token.emergency_accepted_at = None
        create_notification(user.id, f"{token.token_code} emergency request sent to queue control.", "emergency_requested", token.id)
        for operator in User.query.filter_by(role="queue_operator", branch_id=token.branch_id).all():
            create_notification(operator.id, f"{token.token_code} has an emergency request.", "emergency_requested", token.id)
        record_event("emergency_requested", f"{user.name} requested emergency for {token.token_code}.", user=user, token=token)
    elif action == "cancel":
        token.emergency_requested = False
        token.emergency_accepted = False
        token.emergency_requested_at = None
        token.emergency_accepted_at = None
        create_notification(user.id, f"{token.token_code} emergency request cancelled.", "emergency_cancelled", token.id)
        for operator in User.query.filter_by(role="queue_operator", branch_id=token.branch_id).all():
            create_notification(operator.id, f"{token.token_code} emergency request was cancelled by the customer.", "emergency_cancelled", token.id)
        record_event("emergency_cancelled", f"{user.name} cancelled emergency for {token.token_code}.", user=user, token=token)
    else:
        return jsonify({"success": False, "error": "Unknown emergency action"}), 400

    db.session.commit()
    return jsonify({"success": True, "token": serialize_token(token)}), 200


@app.route("/api/user/my-suggestions")
@login_required
def my_suggestions():
    user = current_user()
    suggestions = (
        Suggestion.query.join(Token, Token.id == Suggestion.token_id)
        .filter(Token.user_id == user.id)
        .order_by(Suggestion.created_at.desc())
        .all()
    )
    return jsonify(
        {
            "success": True,
            "suggestions": [
                {
                    "id": item.id,
                    "token_code": item.token.token_code,
                    "provider_name": item.provider.name,
                    "suggestion_text": item.suggestion_text,
                    "selected_items": as_json(item.selected_items_json, []),
                    "aggregates": as_json(item.aggregates_json, {}),
                    "created_at": item.created_at.isoformat() + "Z",
                }
                for item in suggestions
            ],
        }
    ), 200


@app.route("/api/user/notifications")
@login_required
def notifications():
    user = current_user()
    items = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify(
        {
            "success": True,
            "notifications": [
                {
                    "id": item.id,
                    "message": item.message,
                    "type": item.type,
                    "is_read": item.is_read,
                    "created_at": item.created_at.isoformat() + "Z",
                }
                for item in items
            ],
        }
    ), 200


@app.route("/api/user/notifications/mark-read/<int:notification_id>", methods=["PUT"])
@login_required
def notification_read(notification_id):
    item = db.session.get(Notification, notification_id)
    if item and item.user_id == current_user().id:
        item.is_read = True
        db.session.commit()
    return jsonify({"success": True}), 200


@app.route("/api/automation/run", methods=["POST"])
def automation_run():
    if request.headers.get("X-Automation-Key") != AUTOMATION_API_KEY:
        return jsonify({"success": False, "error": "Invalid automation key"}), 401

    now = datetime.utcnow()
    expired_count = 0
    reminder_count = 0
    expiring_tokens = Token.query.filter(
        Token.status.in_(ACTIVE_TOKEN_STATUSES), Token.expires_at <= now
    ).all()
    for token in expiring_tokens:
        token.status = "expired"
        token.completed_at = now
        expired_count += 1
        create_notification(
            token.user_id,
            f"{token.token_code} expired because entry was not verified in time.",
            "token_expired",
            token.id,
        )

    reminder_tokens = Token.query.filter(
        Token.status.in_(("requested", "verified")),
        Token.reminder_sent_at.is_(None),
        Token.expires_at > now,
        Token.expires_at <= now + timedelta(minutes=REMINDER_WINDOW_MINUTES),
    ).all()
    for token in reminder_tokens:
        token.reminder_sent_at = now
        reminder_count += 1
        create_notification(
            token.user_id,
            f"{token.token_code} expires in less than {REMINDER_WINDOW_MINUTES} minutes.",
            "token_reminder",
            token.id,
        )

    db.session.commit()
    return jsonify(
        {
            "success": True,
            "expired_tokens": expired_count,
            "reminders_sent": reminder_count,
            "ran_at": now.isoformat() + "Z",
        }
    ), 200


def seed_data():
    existing_admin = db.session.execute(
        db.text("SELECT id FROM users WHERE role = :role LIMIT 1"),
        {"role": "main_admin"},
    ).first()
    if existing_admin:
        return

    main_admin = User(name="Application Admin", email="admin@queue.com", role="main_admin", user_code=generate_user_code())
    main_admin.set_password("admin123")
    main_admin.set_secret_password("1234")
    db.session.add(main_admin)
    db.session.flush()
    industry_admin = User(
        name="Demo Industry Admin",
        email="industry@queue.com",
        user_code=generate_user_code(),
        role="industry_admin",
        phone="9000000001",
    )
    industry_admin.set_password("demo123")
    db.session.add(industry_admin)
    db.session.flush()

    industry = Industry(
        name="City Care Demo",
        industry_type="hospital",
        details="Demo multi-branch healthcare queue",
        admin=industry_admin,
        terms="Demo terms: manage queue data carefully and keep user details private.",
    )
    db.session.add(industry)
    db.session.flush()
    industry_admin.industry_id = industry.id

    config = {
        "service_provider": {
            "display_user_details": True,
            "display_previous_details": True,
            "display_next_details": True,
            "display_current_details": True,
            "suggestion_boxes": ["Suggestion", "Follow up"],
            "search_items": [
                {"name": "Consultation", "price": 300},
                {"name": "Service Charge", "price": 100},
                {"name": "Follow Up", "price": 0},
            ],
            "aggregations": ["total", "average", "count"],
            "ai_suggestion": True,
        },
        "queue_operator": {"can_edit_user_details": True, "can_allocate_provider": True},
        "user": {
            "display_previous_suggestions": True,
            "display_current_queue_count": True,
            "allow_generate_token": True,
            "display_cash_price": True,
            "display_transactions": True,
            "display_operator_contact": True,
            "display_provider_contact": True,
        },
    }
    schema = [
        {"key": "name", "type": "text", "required": True},
        {"key": "phone", "type": "text", "required": True},
        {"key": "need", "type": "text", "required": True},
    ]
    branch = Branch(
        industry_id=industry.id,
        name="Main Branch",
        details="General queue branch",
        branch_type="hospital",
        address="Chennai, Tamil Nadu, India",
        area="Chennai",
        city="Chennai",
        state="Tamil Nadu",
        pincode="600001",
        latitude=13.0827,
        longitude=80.2707,
        dashboard_config_json=dumps(config),
        user_schema_json=dumps(schema),
    )
    db.session.add(branch)
    db.session.flush()

    operator = User(
        name="Demo Operator",
        email="operator@queue.com",
        user_code=generate_user_code(),
        role="queue_operator",
        phone="9000000002",
        industry_id=industry.id,
        branch_id=branch.id,
    )
    operator.set_password("demo123")
    db.session.add(operator)
    db.session.flush()
    provider = User(
        name="Demo Provider",
        email="provider@queue.com",
        user_code=generate_user_code(),
        role="service_provider",
        phone="9000000003",
        industry_id=industry.id,
        branch_id=branch.id,
    )
    provider.set_password("demo123")
    db.session.add(provider)
    db.session.commit()


def ensure_schema_updates():
    engine_name = db.engine.dialect.name
    inspector = inspect(db.engine)
    if not inspector.has_table("users") or not inspector.has_table("industries"):
        return
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    industry_columns = {column["name"] for column in inspector.get_columns("industries")}

    statements = []
    if "user_code" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN user_code VARCHAR(6)")
    if "secret_password_hash" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN secret_password_hash VARCHAR(255)")
    if "avatar_url" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN avatar_url TEXT")
    if "avatar_preset" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN avatar_preset VARCHAR(40) DEFAULT 'face-1'")
    if "terms_accepted_at" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN terms_accepted_at DATETIME")
    if "device_consent" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN device_consent BOOLEAN")
    if "device_consent_at" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN device_consent_at DATETIME")
    if "address" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN address TEXT")
    if "area" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN area VARCHAR(160)")
    if "city" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN city VARCHAR(120)")
    if "state" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN state VARCHAR(120)")
    if "pincode" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN pincode VARCHAR(20)")
    if "designation" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN designation VARCHAR(120)")
    if "emergency_contact" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN emergency_contact VARCHAR(80)")
    if "personal_details" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN personal_details TEXT")
    if "last_seen_at" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN last_seen_at DATETIME")
    token_columns = {column["name"] for column in inspector.get_columns("tokens")} if inspector.has_table("tokens") else set()
    if "display_name" not in token_columns:
        statements.append("ALTER TABLE tokens ADD COLUMN display_name VARCHAR(160)")
    if "name_mode" not in token_columns:
        statements.append("ALTER TABLE tokens ADD COLUMN name_mode VARCHAR(30) DEFAULT 'default'")
    if "emergency_requested" not in token_columns:
        statements.append("ALTER TABLE tokens ADD COLUMN emergency_requested BOOLEAN DEFAULT 0")
    if "emergency_accepted" not in token_columns:
        statements.append("ALTER TABLE tokens ADD COLUMN emergency_accepted BOOLEAN DEFAULT 0")
    if "emergency_requested_at" not in token_columns:
        statements.append("ALTER TABLE tokens ADD COLUMN emergency_requested_at DATETIME")
    if "emergency_accepted_at" not in token_columns:
        statements.append("ALTER TABLE tokens ADD COLUMN emergency_accepted_at DATETIME")
    if "logo_url" not in industry_columns:
        statements.append("ALTER TABLE industries ADD COLUMN logo_url TEXT")
    if "logo_preset" not in industry_columns:
        statements.append("ALTER TABLE industries ADD COLUMN logo_preset VARCHAR(40) DEFAULT 'logo-1'")
    branch_columns = {column["name"] for column in inspector.get_columns("branches")} if inspector.has_table("branches") else set()
    if "address" not in branch_columns:
        statements.append("ALTER TABLE branches ADD COLUMN address TEXT")
    if "area" not in branch_columns:
        statements.append("ALTER TABLE branches ADD COLUMN area VARCHAR(160)")
    if "city" not in branch_columns:
        statements.append("ALTER TABLE branches ADD COLUMN city VARCHAR(120)")
    if "state" not in branch_columns:
        statements.append("ALTER TABLE branches ADD COLUMN state VARCHAR(120)")
    if "pincode" not in branch_columns:
        statements.append("ALTER TABLE branches ADD COLUMN pincode VARCHAR(20)")
    if "latitude" not in branch_columns:
        statements.append("ALTER TABLE branches ADD COLUMN latitude FLOAT")
    if "longitude" not in branch_columns:
        statements.append("ALTER TABLE branches ADD COLUMN longitude FLOAT")
    device_columns = {column["name"] for column in inspector.get_columns("device_audits")} if inspector.has_table("device_audits") else set()
    if "event_type" not in device_columns:
        statements.append("ALTER TABLE device_audits ADD COLUMN event_type VARCHAR(40) DEFAULT 'consent'")

    if engine_name == "sqlite":
        with db.engine.begin() as connection:
            for statement in statements:
                connection.exec_driver_sql(statement)

    for item in User.query.filter((User.user_code.is_(None)) | (User.user_code == "")).all():
        item.user_code = generate_user_code()
    for item in User.query.filter_by(role="main_admin").all():
        if not item.secret_password_hash:
            item.set_secret_password("1234")
    for item in User.query.filter(User.terms_accepted_at.is_(None)).all():
        item.terms_accepted_at = item.created_at or datetime.utcnow()
    db.session.commit()


with app.app_context():
    db.create_all()
    ensure_schema_updates()
    seed_data()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
