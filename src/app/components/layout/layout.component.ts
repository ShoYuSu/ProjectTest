import { Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';

@Component({ ... }) // คงคลาสเดิมของคุณไว้
export class LayoutComponent implements OnInit {
  private http = inject(HttpClient);
  // ... ตัวแปรของคุณ ...

  fetchPermissionsFromDB() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // 🌟 หัวใจสำคัญ: ส่ง Authorization Header แบบถูกต้อง
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}` 
    });

    this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers }).subscribe({
      next: (res) => {
        // จัดการสิทธิ์...
      },
      error: (err) => {
        console.error('Error:', err);
      }
    });
  }
}