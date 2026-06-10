import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  // 🌟 ใช้ Signal เพื่อบังคับให้ Angular วาดหน้าจอใหม่เสมอเมื่อค่าเปลี่ยน
  isEditMode = signal<boolean>(false);
  isCurrentUser = signal<boolean>(false); 
  errorMessage = signal<string>(''); 
  personIdFromUrl: string | null = null;

  userProfile = signal<any>({
    person_id: 0,
    fullName: '',
    email: '',
    staffCode: '',
    position: '',
    deptId: null,
    image: null,
    degree: '',
    major: '',
    university: '',
    gradYear: '',
    expertise: ''
  });

  // ตัวแปร editData เป็น Object ธรรมดาเพื่อใช้คู่กับ [(ngModel)] ในแบบฟอร์ม
  editData: any = {};

  get expertiseArray() {
    if (!this.userProfile().expertise) return [];
    return this.userProfile().expertise.split(',').map((item: string) => item.trim()).filter((item: string) => item !== '');
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.personIdFromUrl = params['id'] || null;
      this.loadProfileData();
    });
  }

  loadProfileData() {
    const currentUserId = localStorage.getItem('user_id') || '14';
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);
    
    let url = 'http://localhost:8080/api/get_staff_profile.php';
    if (this.personIdFromUrl) {
      url += `?id=${this.personIdFromUrl}`;
    }

    this.http.get<any>(url, { headers }).subscribe({
      next: (res) => {
        // 🌟 เพิ่มจุดเช็ค Log: กด F12 ดูใน Console ว่าข้อมูลจาก DB มาครบไหม
        console.log('📡 ข้อมูลจาก API:', res); 

        if (res && res.status === 'success' && res.data) {
          const basic = res.data.basic_info || {};
          
          let degree = ''; let major = ''; let university = ''; let gradYear = '';
          if (res.data.education && res.data.education.length > 0) {
            const edu = res.data.education[0];
            degree = edu.degree || '';
            major = edu.major || '';
            university = edu.university || '';
            gradYear = edu.graduation_year || '';
          }

          const expertiseStr = (res.data.expertise && Array.isArray(res.data.expertise)) 
                                ? res.data.expertise.join(', ') : '';

          // 🌟 อัปเดตข้อมูลเข้า Signal
          this.userProfile.set({
            person_id: res.data.person_id || 0,
            fullName: basic.full_name || '',
            email: basic.email || '',
            staffCode: basic.staff_code || '',
            position: basic.position || '',
            deptId: basic.dept_id || null,
            image: basic.img_profile || null,
            degree: degree,
            major: major,
            university: university,
            gradYear: gradYear,
            expertise: expertiseStr
          });
          
          this.editData = { ...this.userProfile() };
          this.errorMessage.set('');

          const role = localStorage.getItem('role') || '';
          const permsString = localStorage.getItem('permissions') || '';
          const isAdmin = role === 'admin';
          const hasEditAllPermission = permsString.toLowerCase().includes('staff_info,edit,all');

          this.isCurrentUser.set(res.is_owner || isAdmin || hasEditAllPermission);
        } else {
          this.errorMessage.set(res?.message || 'ไม่สามารถเข้าถึงประวัติพนักงานท่านนี้ได้');
        }
      },
      error: (err) => {
        console.error('API Error:', err);
        this.errorMessage.set('ไม่สามารถเชื่อมต่อฐานข้อมูล หรือเกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.editData.image = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  toggleEdit() {
    this.isEditMode.set(true);
    this.editData = { ...this.userProfile() }; 
  }

  cancelEdit() {
    this.isEditMode.set(false);
  }

  saveProfile() {
    const currentUserId = localStorage.getItem('user_id') || '14';
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);

    const payload = {
      ...this.editData,
      newImage: this.editData.image 
    };

    this.http.post('http://localhost:8080/api/get_staff_profile.php', payload, { headers }).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success') {
          this.isEditMode.set(false);
          alert('อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว!');
          this.loadProfileData(); 
        } else {
          alert('บันทึกไม่สำเร็จ: ' + (res?.message || 'Unknown error'));
        }
      },
      error: (err) => {
        console.error(err);
        alert('เชื่อมต่อเซิร์ฟเวอร์เพื่อบันทึกข้อมูลล้มเหลว');
      }
    });
  }
}