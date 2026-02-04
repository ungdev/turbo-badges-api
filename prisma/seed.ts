import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

const prisma = new PrismaClient({ adapter });


async function main() {
    const roles = [
        { name: 'USER', weight: 10 },
        { name: 'AGENT', weight: 50 },
        { name: 'ADMIN', weight: 100 }
    ]

    const defaultUser = {
        email: 'admin@badges.assos.utt.fr',
        firstName: 'Admin',
        lastName: 'User',
        roleId: (await prisma.role.findUnique({ where: { name: 'ADMIN' } }))!.id,
        password: await bcrypt.hash('turbo-badges-admin', parseInt(process.env.BCRYPT_SALT_ROUNDS || '10'))
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

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })