/**
 * @fileoverview mongoTestHelper — Utilidades de MongoDB en memoria para tests de integración.
 *
 * Usa `mongodb-memory-server` para levantar un proceso MongoDB real en el mismo
 * proceso de Node, sin necesidad de un servidor MongoDB externo.
 *
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PREREQUISITO CRÍTICO PARA TRANSACCIONES ACID                           ║
 * ║                                                                           ║
 * ║  Las sesiones de MongoDB (session.startTransaction) solo funcionan en   ║
 * ║  modo ReplicaSet — NO en standalone.                                    ║
 * ║                                                                           ║
 * ║  mongodb-memory-server puede arrancar en modo ReplicaSet con:            ║
 * ║    replSet: { count: 1, storageEngine: 'wiredTiger' }                   ║
 * ║                                                                           ║
 * ║  Esto nos permite testear las garantías ACID de transactionService       ║
 * ║  sin infraestructura externa.                                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * @module __tests__/helpers/mongoTestHelper
 */

import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let replSet: MongoMemoryReplSet;

/**
 * Arranca un ReplicaSet de MongoDB en memoria y conecta Mongoose.
 * Llamar en `beforeAll` de cada suite de tests de integración.
 *
 * @returns La URI de conexión del ReplicaSet (útil para debugging)
 */
export async function connectTestDatabase(): Promise<string> {
    // Crear un ReplicaSet de 1 nodo — el mínimo para soportar transacciones
    replSet = await MongoMemoryReplSet.create({
        replSet: {
            count:         1,
            storageEngine: 'wiredTiger',
            dbName:        'cryptodash_test',
        },
    });

    const uri = replSet.getUri();
    await mongoose.connect(uri);
    return uri;
}

/**
 * Limpia todas las colecciones sin cerrar la conexión.
 * Llamar en `beforeEach` para garantizar aislamiento entre tests.
 */
export async function clearDatabase(): Promise<void> {
    const collections = mongoose.connection.collections;
    await Promise.all(
        Object.values(collections).map(collection => collection.deleteMany({}))
    );
}

/**
 * Cierra la conexión de Mongoose y detiene el ReplicaSet.
 * Llamar en `afterAll` de cada suite.
 */
export async function disconnectTestDatabase(): Promise<void> {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await replSet.stop();
}
