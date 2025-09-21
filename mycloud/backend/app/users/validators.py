import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

UPPER_RE = re.compile(r"[A-Z]")
DIGIT_RE = re.compile(r"\d")
SPECIAL_RE = re.compile(r"[^\w\s]")

class PasswordPolicyValidator:
    def validate(self, password, user=None):
        if not password or len(password) < 6:
            raise ValidationError(_("Пароль должен быть не короче 6 символов."), code="password_too_short")
        if not UPPER_RE.search(password):
            raise ValidationError(_("Пароль должен содержать хотя бы одну заглавную букву."), code="password_no_upper")
        if not DIGIT_RE.search(password):
            raise ValidationError(_("Пароль должен содержать хотя бы одну цифру."), code="password_no_digit")
        if not SPECIAL_RE.search(password):
            raise ValidationError(_("Пароль должен содержать хотя бы один спецсимвол."), code="password_no_special")

    def get_help_text(self):
        return _("Минимум 6 символов, и по крайней мере одна заглавная буква, одна цифра и один спецсимвол.")
