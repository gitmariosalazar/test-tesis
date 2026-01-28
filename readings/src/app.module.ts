import { Module } from '@nestjs/common';
import { AppController } from './app/controller/app.controller';
import { AppService } from './app/service/app.service';
import { HomeModule } from './app/module/home.module';
import { AppReadingsModulesUsingPostgreSQL } from './factory/postgresql/modules-using-postgresql.module';

@Module({
  imports: [HomeModule, AppReadingsModulesUsingPostgreSQL
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
