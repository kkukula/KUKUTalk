import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS dla dev (dowolne originy)
  app.enableCors({ origin: true, credentials: true });

  // Swagger UI
  const config = new DocumentBuilder()
    .setTitle('KUKUTalk API')
    .setDescription('Dokumentacja endpointów backendu')
    .setVersion('0.1.0')
    .addBearerAuth() // dla /auth/me itp.
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}  |  Swagger: /docs`);
}
bootstrap();
