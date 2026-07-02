import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
// 🌟 ลบ import provideClientHydration ทิ้งไป
import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // 🌟 ลบ provideClientHydration() ออกจากตรงนี้ด้วย
    provideHttpClient(withFetch())
  ]
};