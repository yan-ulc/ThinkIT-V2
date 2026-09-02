from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
import uuid
import midtransclient
from .models import Transaction

# Initialize Midtrans Snap Client
snap = midtransclient.Snap(
    is_production=settings.MIDTRANS_IS_PRODUCTION,
    server_key=settings.MIDTRANS_SERVER_KEY,
    client_key=settings.MIDTRANS_CLIENT_KEY
)

# Initialize Midtrans Core API Client (for Webhooks)
core_api = midtransclient.CoreApi(
    is_production=settings.MIDTRANS_IS_PRODUCTION,
    server_key=settings.MIDTRANS_SERVER_KEY,
    client_key=settings.MIDTRANS_CLIENT_KEY
)

class PaymentViewSet(viewsets.ViewSet):
    
    def get_permissions(self):
        if self.action == 'webhook':
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['post'])
    def create_transaction(self, request):
        user = request.user
        amount = request.data.get('amount', 50000)
        
        order_id = f"THINKIT-{uuid.uuid4().hex[:8].upper()}"
        
        transaction = Transaction.objects.create(
            user=user,
            order_id=order_id,
            amount=amount,
            status=Transaction.StatusChoices.PENDING
        )
        
        param = {
            "transaction_details": {
                "order_id": order_id,
                "gross_amount": int(amount)
            },
            "customer_details": {
                "first_name": user.email.split('@')[0],
                "email": user.email
            },
            "item_details": [
                {
                    "id": "THINKIT_PREMIUM",
                    "price": int(amount),
                    "quantity": 1,
                    "name": "ThinkIT Premium Access"
                }
            ]
        }
        
        try:
            snap_response = snap.create_transaction(param)
            return Response({
                'token': snap_response['token'],
                'redirect_url': snap_response['redirect_url'],
                'order_id': order_id
            })
        except Exception as e:
            return Response({
                'error': True,
                'message': str(e),
                'note': 'Midtrans might not be configured yet.'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def webhook(self, request):
        notification = request.data
        
        try:
            status_response = core_api.transactions.notification(notification)
            order_id = status_response['order_id']
            transaction_status = status_response['transaction_status']
            fraud_status = status_response.get('fraud_status')
            
            try:
                txn = Transaction.objects.get(order_id=order_id)
            except Transaction.DoesNotExist:
                return Response({'status': 'order not found'}, status=status.HTTP_404_NOT_FOUND)
            
            if transaction_status == 'capture':
                if fraud_status == 'challenge':
                    txn.status = Transaction.StatusChoices.PENDING
                elif fraud_status == 'accept':
                    txn.status = Transaction.StatusChoices.SUCCESS
            elif transaction_status == 'settlement':
                txn.status = Transaction.StatusChoices.SUCCESS
            elif transaction_status in ['cancel', 'deny', 'expire']:
                txn.status = Transaction.StatusChoices.FAILED
            elif transaction_status == 'pending':
                txn.status = Transaction.StatusChoices.PENDING
                
            txn.payment_type = status_response.get('payment_type')
            txn.payment_details = status_response
            txn.save()
            
            return Response({'status': 'ok'})
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
