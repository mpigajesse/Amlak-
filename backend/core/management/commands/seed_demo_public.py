"""Commande `seed_demo_public` — jeu de données de la démo publique (portfolio).

Distincte de `seed_demo` (smoke test du dev, compte admin/admin) :
- le compte de démo n'est PAS superutilisateur, et son mot de passe vient de
  `AMLAK_DEMO_PASSWORD` — jamais d'identifiant codé en dur dans un dépôt public ;
- tout est fictif : promoteur, projets, fournisseurs, acquéreurs, numéros.

Idempotente : si le compte de démo possède déjà des projets, rien n'est recréé.
Les libellés affichés (« Facturé » / « Hors facture ») relèvent du frontend
(VITE_LIBELLE_BLANC / VITE_LIBELLE_NOIR) ; les champs restent amount_blanc /
amount_noir.
"""

from __future__ import annotations

import os
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from acquisitions.models import Acquisition
from cheques.models import Cheque
from core.models.user_settings import UserSettings
from projects.models import Project
from suppliers.models import Supplier
from transactions.models import Transaction
from units.models import StockUnit

User = get_user_model()

DEMO_EMAIL = os.environ.get("AMLAK_DEMO_EMAIL", "demo@amlak-demo.ma")

FOURNISSEURS = [
    ("Bâti Atlas SARL", "gros_oeuvre"),
    ("Matériaux du Souss", "materiaux"),
    ("Cabinet Archi Lumière", "architecte"),
    ("Électricité Nour", "second_oeuvre"),
    ("Étude Maître Alaoui (fictif)", "notaire"),
]


def _d(montant: int) -> Decimal:
    return Decimal(montant)


class Command(BaseCommand):
    help = "Crée le compte et les données fictives de la démo publique (idempotent)."

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        mot_de_passe = os.environ.get("AMLAK_DEMO_PASSWORD")
        if not mot_de_passe:
            raise CommandError("AMLAK_DEMO_PASSWORD manquant : mot de passe du compte de démo.")

        user, cree = User.objects.get_or_create(
            email=DEMO_EMAIL,
            defaults={"first_name": "Promoteur", "last_name": "Démo", "is_active": True, "locale": "fr-MA"},
        )
        user.set_password(mot_de_passe)  # suit la variable si elle change
        user.save()
        UserSettings.objects.get_or_create(user=user)

        if Project.objects.filter(owner=user).exists():
            self.stdout.write("Démo publique déjà en place : rien à créer.")
            return

        aujourd_hui = date.today()
        fournisseurs = {
            cat: Supplier.objects.create(owner=user, name=nom, category=cat, phone="+212 600 000 000")
            for nom, cat in FOURNISSEURS
        }

        residence = Project.objects.create(
            owner=user, name="Résidence Les Orangers", location="Casablanca — Bouskoura",
            description="12 appartements et 2 magasins en R+3 (projet fictif).", stage="actif",
            budget_acquisition=_d(3_200_000), budget_travaux=_d(4_800_000),
            budget_admin=_d(450_000), budget_commercialisation=_d(300_000),
            expected_delivery_date=aujourd_hui + timedelta(days=240),
        )
        villas = Project.objects.create(
            owner=user, name="Villas Palmeraie", location="Marrakech — route de Fès",
            description="Lotissement de 6 villas (projet fictif).", stage="actif",
            budget_acquisition=_d(2_500_000), budget_travaux=_d(3_600_000),
            budget_admin=_d(300_000), budget_commercialisation=_d(250_000),
            expected_delivery_date=aujourd_hui + timedelta(days=420),
        )

        terrain = Acquisition.objects.create(
            owner=user, project=residence, title="Terrain Bouskoura — 1 200 m²", stage="achete",
            surface_m2=_d(1200), asking_price=_d(3_400_000), negotiated_price=_d(3_150_000),
            seller_name="Vendeur fictif", address="Bouskoura, Casablanca",
        )
        Acquisition.objects.create(
            owner=user, project=villas, title="Parcelle Tamansourt — 2 000 m²", stage="negociation",
            surface_m2=_d(2000), asking_price=_d(1_900_000),
            option_deadline=aujourd_hui + timedelta(days=21), seller_name="Vendeur fictif",
        )

        lots = []
        for i in range(1, 13):
            etage = (i - 1) // 4 + 1
            stage = "encaisse" if i <= 3 else "compromis" if i <= 5 else "reservation" if i <= 7 else "stock"
            lot = StockUnit.objects.create(
                owner=user, project=residence, acquisition=terrain, label=f"Appartement A{etage}{i:02d}",
                unit_type="appartement", surface_m2=_d(85 + (i % 3) * 15), price_asked=_d(950_000 + (i % 3) * 150_000),
                stage=stage, buyer_name="Acquéreur fictif" if stage != "stock" else "",
                reserved_at=aujourd_hui - timedelta(days=60) if stage != "stock" else None,
                compromis_at=aujourd_hui - timedelta(days=40) if stage in ("compromis", "encaisse") else None,
                encaisse_at=aujourd_hui - timedelta(days=15) if stage == "encaisse" else None,
            )
            lots.append(lot)
        for i in range(1, 3):
            StockUnit.objects.create(
                owner=user, project=residence, acquisition=terrain, label=f"Magasin M{i}",
                unit_type="magasin", surface_m2=_d(60), price_asked=_d(1_400_000), stage="stock",
            )
        for i in range(1, 7):
            StockUnit.objects.create(
                owner=user, project=villas, label=f"Villa V{i}", unit_type="villa",
                surface_m2=_d(280), price_asked=_d(3_200_000),
                stage="reservation" if i == 1 else "stock",
                buyer_name="Acquéreur fictif" if i == 1 else "",
                reserved_at=aujourd_hui - timedelta(days=10) if i == 1 else None,
            )

        def mouvement(jours: int, sens: str, mode: str, blanc: int, noir: int, projet: Project,
                      categorie: str, libelle: str, **liens: Any) -> None:
            Transaction.objects.create(
                owner=user, date=aujourd_hui - timedelta(days=jours), direction=sens, payment_mode=mode,
                amount_blanc=_d(blanc), amount_noir=_d(noir), project=projet, category=categorie,
                label=libelle, **liens,
            )

        # Quatre mois d'activité : acquisition, travaux, frais, puis premières ventes.
        # Apports des associés en début de projet : sans eux, la position cash de la
        # démo serait lourdement négative, ce qui ne correspond à aucun cas réel.
        mouvement(125, "in", "virement", 5_500_000, 0, residence, "autre", "Apport des associés")
        mouvement(65, "in", "virement", 3_000_000, 0, villas, "autre", "Apport des associés")
        mouvement(120, "out", "virement", 2_900_000, 250_000, residence, "acquisition", "Achat du terrain", acquisition=terrain)
        mouvement(110, "out", "virement", 85_000, 0, residence, "admin", "Frais de notaire", supplier=fournisseurs["notaire"])
        mouvement(100, "out", "virement", 120_000, 0, residence, "travaux", "Études et plans", supplier=fournisseurs["architecte"])
        for k, jours in enumerate(range(90, 0, -15)):
            mouvement(jours, "out", "cheque" if k % 2 else "virement", 310_000, 40_000 if k % 3 == 0 else 0,
                      residence, "travaux", f"Situation de travaux n°{k + 1}", supplier=fournisseurs["gros_oeuvre"])
            mouvement(jours - 3, "out", "espece", 0, 28_000, residence, "travaux", "Main-d'œuvre chantier")
            mouvement(jours - 5, "out", "virement", 95_000, 0, residence, "travaux", "Ciment et acier", supplier=fournisseurs["materiaux"])
        mouvement(45, "out", "virement", 65_000, 0, residence, "travaux", "Lot électricité", supplier=fournisseurs["second_oeuvre"])
        mouvement(30, "out", "virement", 40_000, 0, residence, "commercialisation", "Panneaux et annonces")
        for lot, jours in zip(lots[:7], [70, 64, 58, 50, 44, 30, 18]):
            mouvement(jours, "in", "virement", 180_000, 20_000, residence, "vente", f"Avance — {lot.label}", stock_unit=lot)
        for lot, jours in zip(lots[:3], [25, 20, 15]):
            mouvement(jours, "in", "virement", 800_000, 50_000, residence, "vente", f"Solde — {lot.label}", stock_unit=lot)
        mouvement(10, "in", "cheque", 300_000, 0, villas, "vente", "Réservation — Villa V1")
        mouvement(60, "out", "virement", 2_300_000, 150_000, villas, "acquisition", "Achat des parcelles")

        # Chèques : reçus d'acquéreurs, émis aux fournisseurs, à échéances variées.
        for i, (sens, statut, jours, montant, part_noir) in enumerate([
            ("in", "pending", 12, 250_000, 0), ("in", "pending", 35, 400_000, 50_000),
            ("out", "pending", 8, 310_000, 0), ("out", "pending", 20, 180_000, 30_000),
            ("in", "cashed", -10, 200_000, 0), ("out", "debited", -25, 95_000, 0),
        ]):
            Cheque.objects.create(
                owner=user, direction=sens, number=f"DEMO{1000 + i}", bank=["attijariwafa", "bcp", "cih"][i % 3],
                amount=_d(montant), amount_blanc=_d(montant - part_noir), amount_noir=_d(part_noir),
                party_name="Acquéreur fictif" if sens == "in" else "Bâti Atlas SARL",
                issue_date=aujourd_hui - timedelta(days=30), due_date=aujourd_hui + timedelta(days=jours),
                status=statut, project=residence,
                supplier=fournisseurs["gros_oeuvre"] if sens == "out" else None,
            )

        self.stdout.write(self.style.SUCCESS(f"Démo publique créée pour {DEMO_EMAIL}."))
