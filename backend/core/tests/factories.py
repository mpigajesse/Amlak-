"""
Factory classes for creating test objects.

These factories are used to create consistent test data across the test suite.
Use factory_boy to generate realistic test objects without boilerplate.
"""

import factory
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory

User = get_user_model()


class UserFactory(DjangoModelFactory):
    """Factory for creating test User instances.

    Example:
        user = UserFactory()  # Creates a user with email user0@amlak.ma
        user = UserFactory(email='custom@amlak.ma')  # Custom email
        user = UserFactory(first_name='John')  # Custom first_name
    """

    class Meta:
        model = User
        django_get_or_create = ("email",)

    email = factory.Sequence(lambda n: f"user{n}@amlak.ma")
    first_name = "Test"
    last_name = factory.Sequence(lambda n: f"User{n}")
    locale = "fr-MA"

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        """Set password after creation.

        Default password is 'testpass123' unless specified:
            user = UserFactory(password='custompass')
        """
        self.set_password(extracted or "testpass123")
        if create:
            self.save()
