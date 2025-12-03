from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.agenda.models import Professional
from django.utils.text import slugify

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates user accounts for professionals who do not have one.'

    def handle(self, *args, **options):
        professionals = Professional.objects.filter(user__isnull=True)
        
        if not professionals.exists():
            self.stdout.write(self.style.SUCCESS("All professionals already have user accounts."))
            return

        self.stdout.write(f"Found {professionals.count()} professionals without users.")

        for prof in professionals:
            # Generate email if missing
            if prof.email:
                email = prof.email
            else:
                # Generate a dummy email: nombre.apellido@revitek.cl
                slug = slugify(f"{prof.first_name} {prof.last_name}")
                email = f"{slug.replace('-', '.')}@revitek.cl"
            
            # Check if user with this email already exists
            if User.objects.filter(email=email).exists():
                self.stdout.write(self.style.WARNING(f"User with email {email} already exists. Skipping {prof}."))
                continue

            # Create User
            password = "Revitek2025!" # Default temporary password
            try:
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    first_name=prof.first_name,
                    last_name=prof.last_name,
                    phone=prof.phone or "56900000000"
                )
                
                # Link to Professional
                prof.user = user
                prof.save()
                
                self.stdout.write(self.style.SUCCESS(f"Created user for {prof}: {email} / {password}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to create user for {prof}: {e}"))
