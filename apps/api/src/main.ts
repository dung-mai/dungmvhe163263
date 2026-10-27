import { createApp } from './app';
async function bootstrap() {
  const app = await createApp();
  await app.listen(Number(process.env.PORT ?? 4000), process.env.HOST ?? '127.0.0.1');
}
void bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
