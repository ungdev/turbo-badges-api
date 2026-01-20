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