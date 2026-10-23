import { MongoMemoryServer } from 'mongodb-memory-server';

async function startLocalMongo() {
  try {
    const mongod = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'hireflow'
      }
    });
    console.log('[MongoDaemon] MongoDB local instance listening on port 27017 at:', mongod.getUri());
    
    // Keep alive
    process.on('SIGINT', async () => {
      await mongod.stop();
      process.exit(0);
    });
  } catch (err) {
    console.error('[MongoDaemon] Could not bind to port 27017:', err.message);
  }
}

startLocalMongo();
