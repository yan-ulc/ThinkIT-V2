from django.db import models
from django.conf import settings
import uuid

class Transaction(models.Model):
    class StatusChoices(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'
        EXPIRED = 'EXPIRED', 'Expired'
        CANCELED = 'CANCELED', 'Canceled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    order_id = models.CharField(max_length=100, unique=True, help_text="Order ID for Midtrans")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING)
    payment_type = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. gopay, bank_transfer, qris")
    payment_details = models.JSONField(blank=True, null=True, help_text="Raw response from Midtrans")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.order_id} - {self.user.email} - {self.status}"
