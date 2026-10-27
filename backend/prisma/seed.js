const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  console.log('🔒 Starting Security-First Database Seeder...');

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@securestore.com').toLowerCase().trim();
  const adminRawPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@Secure2026!';

  // Validate admin password policy before seeding
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+={}[\]|\\:;"'<>,.~/`])[A-Za-z\d@$!%*?&#^()_\-+={}[\]|\\:;"'<>,.~/`]{8,}$/;
  if (!passwordRegex.test(adminRawPassword)) {
    throw new Error('SEED_ADMIN_PASSWORD does not meet strict security policy requirements.');
  }

  const hashedPassword = await bcrypt.hash(adminRawPassword, SALT_ROUNDS);

  // 1. Upsert Admin Account
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      email: adminEmail,
      name: 'System Administrator',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user ready: ${admin.email} (Role: ${admin.role})`);

  // 2. Seed Categories
  const categoriesData = [
    { name: 'Hardware Security', slug: 'hardware-security' },
    { name: 'Network & Privacy', slug: 'network-privacy' },
    { name: 'Encrypted Storage', slug: 'encrypted-storage' },
    { name: 'Developer Gear', slug: 'developer-gear' },
  ];

  const categoryMap = {};
  for (const cat of categoriesData) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
    categoryMap[cat.slug] = record.id;
  }
  console.log(`✅ Seeded ${Object.keys(categoryMap).length} categories.`);

  // 3. Seed 8 Products
  const productsData = [
    {
      name: 'TitanKey FIDO2/WebAuthn USB-C Security Key',
      description: 'Hardware authentication token supporting FIDO2, U2F, and Passkeys. Phishing-resistant MFA with tamper-evident secure element.',
      price: 1890,
      stock: 45,
      imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
      categoryId: categoryMap['hardware-security'],
    },
    {
      name: 'BioKey Pro Fingerprint Hardware Token (NFC + USB)',
      description: 'Biometric hardware security key with on-chip fingerprint matching and NFC support for mobile and enterprise zero-trust access.',
      price: 3250,
      stock: 20,
      imageUrl: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=800&q=80',
      categoryId: categoryMap['hardware-security'],
    },
    {
      name: 'VaultDrive 1TB FIPS 140-3 Hardware Encrypted NVMe SSD',
      description: 'AES-256 XTS hardware-encrypted portable NVMe drive with physical PIN keypad and brute-force self-destruct protection.',
      price: 6490,
      stock: 15,
      imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80',
      categoryId: categoryMap['encrypted-storage'],
    },
    {
      name: 'CryptoSafe Air-Gapped Cold Storage Wallet Metal Plate',
      description: 'Fireproof and corrosion-resistant 316L stainless steel seed phrase backup capsule for sovereign cryptographic key recovery.',
      price: 2190,
      stock: 30,
      imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=800&q=80',
      categoryId: categoryMap['encrypted-storage'],
    },
    {
      name: 'ZeroTrust Pocket Travel Router (WireGuard & Tor Ready)',
      description: 'Open-source Wi-Fi 6 travel router with pre-configured WireGuard VPN kill-switch, DNS-over-HTTPS, and hardware toggle switch.',
      price: 3890,
      stock: 25,
      imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
      categoryId: categoryMap['network-privacy'],
    },
    {
      name: 'Faraday Shield Signal-Blocking Sleeve (Laptop & Phone Kit)',
      description: 'Military-grade RF/EMF shielding pouch blocking Cellular, Wi-Fi, Bluetooth, GPS, and RFID/NFC signals completely.',
      price: 1450,
      stock: 50,
      imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
      categoryId: categoryMap['network-privacy'],
    },
    {
      name: 'SecOps Mechanical Keyboard QMK/VIA 75% (Hot-Swappable)',
      description: 'Open-source firmware programmable mechanical keyboard with anodized aluminum frame and tactile switches for security engineers.',
      price: 4590,
      stock: 18,
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
      categoryId: categoryMap['developer-gear'],
    },
    {
      name: 'PrivacyGuard Anti-Spy Micro-Louver Monitor Filter 16"',
      description: 'Limits viewing angle to +/- 30 degrees to prevent visual shoulder-surfing in public workspaces while reducing blue light.',
      price: 1290,
      stock: 40,
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
      categoryId: categoryMap['developer-gear'],
    },
  ];

  // Clear existing products only if there are no orders referencing them, or upsert by name
  for (const prod of productsData) {
    const existing = await prisma.product.findFirst({
      where: { name: prod.name },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: prod,
      });
    } else {
      await prisma.product.create({
        data: prod,
      });
    }
  }

  console.log(`✅ Seeded ${productsData.length} security products.`);
  console.log('🎉 Database seeding completed securely!');
}

main()
  .catch((err) => {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

