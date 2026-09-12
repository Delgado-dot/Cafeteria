"""La disponibilidad de delivery debe poder consultarse desde checkout."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.accounts.models import RolePermission
from apps.accounts.permissions import _clear_permissions_cache

@pytest.fixture
def client(db):
    user = get_user_model().objects.create_user(username='delivery-qa',email='delivery-qa@intesud.edu.ec',password='testpass123',role='user')
    api = APIClient()
    api.force_authenticate(user)
    return api

def test_buyer_can_read_delivery_configuration(client):
    response = client.get('/api/delivery/config/')
    assert response.status_code == 200
    assert 'enabled' in response.data

def test_buyer_cannot_edit_configuration_or_list_other_deliveries(client):
    assert client.patch('/api/delivery/config/', {'enabled':True}, format='json').status_code == 403
    assert client.get('/api/delivery/requests/').status_code == 403

def test_revoked_order_permission_also_denies_checkout_configuration(client):
    RolePermission.objects.update_or_create(role='user',code='orders.create',defaults={'enabled':False})
    _clear_permissions_cache()
    assert client.get('/api/delivery/config/').status_code == 403

def test_anonymous_cannot_read_delivery_configuration(client):
    client.force_authenticate(user=None)
    assert client.get('/api/delivery/config/').status_code == 401

def test_bar_admin_can_still_update_configuration(client):
    admin = get_user_model().objects.create_user(username='bar-delivery',email='bar-delivery@intesud.edu.ec',password='testpass123',role='adminbar')
    client.force_authenticate(admin)
    assert client.patch('/api/delivery/config/', {'enabled':True}, format='json').status_code == 200
