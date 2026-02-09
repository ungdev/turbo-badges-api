import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

const prisma = new PrismaClient({ adapter });

/**
 * Check if the database has been seeded
 * @returns true if the database has been seeded, false otherwise
 */
export async function isSeeded(): Promise<boolean> {
    try {
        const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
        return adminRole !== null;
    } catch (error) {
        return false;
    }
}

/**
 * Seed the database with initial data
 */
export async function seed() {
    const roles = [
        { name: 'USER', weight: 10 },
        { name: 'AGENT', weight: 50 },
        { name: 'ADMIN', weight: 100 }
    ]

    const defaultUser = {
        email: process.env.ADMIN_EMAIL || 'admin@turbobadges.internal',
        firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
        lastName: process.env.ADMIN_LAST_NAME || 'User',
        roleId: (await prisma.role.findUnique({ where: { name: 'ADMIN' } }))!.id,
        password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'TurboBadgesExamplePassword', parseInt(process.env.BCRYPT_SALT_ROUNDS || '10'))
    }

    const commissions = [
        { name: 'Bureau' },
        { name: 'Communication' },
        { name: 'Logistique' },
        { name: 'Sécurité' },
    ]

    const grades = [
        { name: 'Président' },
        { name: 'Vice-Président' },
        { name: 'Coordinateur' },
        { name: 'Responsable' },
        { name: 'Membre' },
    ]

    const accesses = [
        { name: 'Total' },
        { name: 'Restreint' },
        { name: 'Scène' },
    ]

    for (const role of roles) {
        await prisma.role.upsert({
            where: { name: role.name },
            update: { weight: role.weight },
            create: role,
        })
    }

    await prisma.user.upsert({
        where: { email: defaultUser.email },
        update: { ...defaultUser },
        create: defaultUser,
    })

    for (const commission of commissions) {
        await prisma.commission.upsert({
            where: { name: commission.name },
            update: { ...commission },
            create: commission,
        })
    }

    for (const grade of grades) {
        await prisma.grade.upsert({
            where: { name: grade.name },
            update: { ...grade },
            create: grade,
        })
    }

    for (const access of accesses) {
        await prisma.access.upsert({
            where: { name: access.name },
            update: { ...access },
            create: access,
        })
    }
}

async function main() {
    const alreadySeeded = await isSeeded();
    if (alreadySeeded) {
        console.log('Database is already seeded, skipping...');
        return;
    }

    console.log('Seeding database...');
    await seed();
    console.log('Database seeding completed!');
}

// Only run if called directly (not imported)
if (require.main === module) {
    main()
        .then(async () => {
            await prisma.$disconnect()
        })
        .catch(async (e) => {
            console.error(e)
            await prisma.$disconnect()
            process.exit(1)
        })
}