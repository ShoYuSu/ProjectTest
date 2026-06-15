import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { HttpClientModule, HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http'; 

@Component({
  selector: 'app-add-staff',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HttpClientModule], 
  templateUrl: './add-staff.component.html',
  styleUrl: './add-staff.component.css'
})
export class AddStaffComponent {
  private http = inject(HttpClient);
  private router = inject(Router);

  showSuccessModal = signal<boolean>(false);
  loading = false;

  staffData = {
    fullName: '',
    staffCode: '',
    email: '',
    deptId: null as number | null,
    position: 'อาจารย์ประจำ' 
  };

  selectedFile: File | null = null;
  imagePreview = signal<string | null>(null);

  modules = [
    { id: 1, name: 'Dashboard', subName: 'แดชบอร์ด', moduleCode: 'Dashboard', isDashboard: true, viewAccess: true, view: 'all', add: 'none', edit: 'none' },
    { id: 2, name: 'Staff Info', subName: 'ข้อมูลบุคลากร', moduleCode: 'Staff_info', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 3, name: 'Research Info', subName: 'ข้อมูลวิจัย', moduleCode: 'Research_info', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 4, name: 'Plans / Projects', subName: 'แผนงาน / โครงการ', moduleCode: 'Plan_Project', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 5, name: 'Training', subName: 'ข้อมูลอบรม', moduleCode: 'Training', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' }
  ];

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview.set(reader.result as string);
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  private mapScopeToDatabase(scopeValue: string): string {
    if (scopeValue === 'own') return 'self';
    if (scopeValue === 'dept') return 'department';
    return scopeValue; 
  }

  onSubmit() {
    if (!this.staffData.fullName || !this.staffData.staffCode || !this.staffData.email) {
      alert('กรุณากรอกข้อมูลพื้นฐานให้ครบถ้วน');
      return;
    }

    this.loading = true;

    const permissionsToSend = this.modules.map(mod => ({
      module_name: mod.moduleCode,
      view: mod.isDashboard ? (mod.viewAccess ? 'all' : 'none') : this.mapScopeToDatabase(mod.view),
      add: this.mapScopeToDatabase(mod.add),
      edit: this.mapScopeToDatabase(mod.edit)
    }));

    const formData = new FormData();
    formData.append('fullName', this.staffData.fullName);
    formData.append('staffCode', this.staffData.staffCode);
    formData.append('email', this.staffData.email);
    formData.append('position', this.staffData.position); 
    formData.append('permissions', JSON.stringify(permissionsToSend));
    
    if (this.staffData.deptId !== null) {
      formData.append('deptId', this.staffData.deptId.toString());
    }

    if (this.selectedFile) {
      formData.append('img_profile', this.selectedFile, this.selectedFile.name);
    }

    const currentUserId = localStorage.getItem('user_id') || '14';
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);

    this.http.post<any>('http://localhost:8080/api/add_staff.php', formData, { headers })
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response && response.success) {
            this.showSuccessModal.set(true);
          } else {
            alert('❌ บันทึกไม่สำเร็จ (จากฐานข้อมูล): \n' + (response?.message || 'ไม่ทราบสาเหตุ'));
          }
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          console.error('รายละเอียด Error:', err);
          
          let errorDetail = '';
          if (err.status === 0) {
            errorDetail = 'รหัส 0: เบราว์เซอร์ไม่สามารถเชื่อมต่อ Apache ได้เลย\n(เช็คให้ชัวร์ว่า XAMPP รัน Apache ที่พอร์ต 8080 จริงๆ)';
          } else if (err.status === 404) {
            errorDetail = 'รหัส 404: หาไฟล์ add_staff.php ไม่เจอในโฟลเดอร์ XAMPP/htdocs/api/';
          } else {
            errorDetail = `รหัส ${err.status}: เซิร์ฟเวอร์ทำงานผิดพลาด (ดูรายละเอียดใน Console)`;
          }

          alert(`🚨 การเชื่อมต่อล้มเหลว!\n\n${errorDetail}\n\nกรุณากด F12 เลือกแท็บ Console เพื่อดู Error ตัวเต็มครับ`);
        }
      });
  }

  closeModal() {
    this.showSuccessModal.set(false);
    this.router.navigate(['/staff']);
  }
}