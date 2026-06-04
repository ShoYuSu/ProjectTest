import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  
  isStudentPage: boolean = false;
  loginStep: 'select' | 'student' | 'teacher' = 'select';
  hidePassword = true;

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  loading = false;
  showErrorModal = false;
  errorMessage = '';

  // ⭐️ แก้ไข URL ตรงนี้ให้ตรงกับ Path ในเครื่องที่รัน XAMPP ของคุณ
  // ตัวอย่างเช่น ถ้าไฟล์ login.php อยู่ในโฟลเดอร์ htdocs/api/ ให้ตั้งเป็น 'http://localhost/api'
  private apiUrl = 'http://localhost/api'; 

  setStep(step: 'select' | 'student' | 'teacher') {
    this.loginStep = step;
    this.isStudentPage = (step === 'student');
    this.loginForm.reset(); 
    this.cdr.detectChanges();
  }

  closeModal() {
    this.showErrorModal = false;
    this.cdr.detectChanges();
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;

    // เตรียมข้อมูลส่งไปที่ login.php
    const payload = {
      email: email,
      password: password,
      login_type: this.isStudentPage ? 'student' : 'staff'
    };

    // 🟢 โหมดเชื่อมต่อ API จริง
    this.http.post(`${this.apiUrl}/login.php`, payload).subscribe({
      next: (res: any) => {
        if (res.success) {
          const role = res.role?.toLowerCase().trim();
          
          // เนื่องจาก login.php ไม่ได้สร้าง Token กลับมา เราจึงจำลองไว้ก่อนไม่ให้ระบบพัง
          localStorage.setItem('token', res.token || 'system-token-placeholder');
          
          // บันทึกข้อมูลผู้ใช้ลง LocalStorage
          localStorage.setItem('role', role);
          localStorage.setItem('full_name', res.full_name || '');
          localStorage.setItem('img_profile', res.img_profile || '');
          localStorage.setItem('user_id', res.user_id);

          // พาไปหน้า Dashboard ของเรา
          this.router.navigate(['/dashboard']);
        } else {
          // กรณีรหัสผิด หรือผิดประเภทผู้ใช้ (แสดงข้อความจาก Backend)
          this.errorMessage = res.message || 'ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง';
          this.showErrorModal = true;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Login Error:', err);
        this.errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ฐานข้อมูลได้';
        this.showErrorModal = true;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}