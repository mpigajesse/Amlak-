"""Tests unitaires du modèle `Supplier`."""
from __future__ import annotations

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from core.tests.factories import UserFactory
from suppliers.models import Supplier, SupplierCategory, validate_ice
from suppliers.tests.factories import SupplierFactory


@pytest.mark.django_db
class TestSupplierModel:
    def test_str_returns_name(self):
        supplier = SupplierFactory(name="Entreprise Bennani")
        assert str(supplier) == "Entreprise Bennani"

    def test_default_ordering_by_name(self):
        user = UserFactory()
        SupplierFactory(owner=user, name="Zellige Atlas")
        SupplierFactory(owner=user, name="Alpha BTP")
        SupplierFactory(owner=user, name="Marbrerie Centrale")
        names = list(
            Supplier.objects.filter(owner=user).values_list("name", flat=True)
        )
        assert names == ["Alpha BTP", "Marbrerie Centrale", "Zellige Atlas"]

    def test_unique_name_per_owner(self):
        user = UserFactory()
        SupplierFactory(owner=user, name="Entreprise X")
        with pytest.raises(IntegrityError), transaction.atomic():
            SupplierFactory(owner=user, name="Entreprise X")

    def test_same_name_allowed_across_owners(self):
        u1 = UserFactory()
        u2 = UserFactory()
        SupplierFactory(owner=u1, name="Entreprise Partagée")
        # Ne doit pas lever
        SupplierFactory(owner=u2, name="Entreprise Partagée")
        assert (
            Supplier.objects.filter(name="Entreprise Partagée").count() == 2
        )

    def test_clean_rejects_bad_ice(self):
        supplier = SupplierFactory.build(ice="123")
        with pytest.raises(ValidationError) as exc:
            supplier.full_clean()
        assert "ICE" in str(exc.value) or "15 chiffres" in str(exc.value)

    def test_clean_accepts_empty_ice(self):
        # full_clean ne doit pas lever si ICE est vide
        user = UserFactory()
        supplier = Supplier(owner=user, name="Sans ICE", ice="")
        supplier.full_clean()  # ne lève pas


class TestValidateIce:
    """Tests isolés du validator `validate_ice`."""

    def test_empty_ok(self):
        validate_ice("")
        validate_ice(None)  # type: ignore[arg-type]

    def test_15_digits_ok(self):
        validate_ice("123456789012345")

    @pytest.mark.parametrize(
        "bad",
        [
            "12345",
            "1234567890123456",  # 16 chiffres
            "12345678901234A",  # lettre
            "123 456789012345",  # espace
            "12345678901234.",  # ponctuation
        ],
    )
    def test_invalid_raises(self, bad):
        with pytest.raises(ValidationError) as exc:
            validate_ice(bad)
        assert "L'ICE doit contenir exactement 15 chiffres." in str(exc.value)


def test_category_choices_include_expected():
    """Sanity check : les catégories clés existent."""
    values = {c.value for c in SupplierCategory}
    assert "gros_oeuvre" in values
    assert "architecte" in values
    assert "notaire" in values
    assert "autre" in values
