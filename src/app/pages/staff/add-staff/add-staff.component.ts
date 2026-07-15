import { Component, signal, inject, OnInit } from '@angular/core';
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
export class AddStaffComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  showSuccessModal = signal<boolean>(false);
  loading = false;

  // 🌟 เพิ่มฟิลด์ role สำหรับส่งไปให้ระบบ Login ของเพื่อน
  staffData = {
    fullName: '',
    staffCode: '',
    email: '',
    deptId: null as number | null,
    position: 'อาจารย์', 
    role: 'teacher' 
  };

  selectedFile: File | null = null;
  imagePreview = signal<string | null>(null);

  templates = signal<any[]>([]);
  currentTemplateName = signal<string>(''); 

  modules = [
    { id: 1, name: 'Dashboard', subName: 'แดชบอร์ด', moduleCode: 'Dashboard', isDashboard: true, viewAccess: true, view: 'all', add: 'none', edit: 'none' },
    { id: 2, name: 'Staff Info', subName: 'ข้อมูลบุคลากร', moduleCode: 'Staff_info', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 3, name: 'Research Info', subName: 'ข้อมูลวิจัย', moduleCode: 'Research_info', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 4, name: 'Plans / Projects', subName: 'แผนงาน / โครงการ', moduleCode: 'Plan_Project', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 5, name: 'Training', subName: 'ข้อมูลอบรม', moduleCode: 'Training', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' }
  ];

  private readonly defaultTemplates = [
    {
      name: 'แอดมิน',
      permissions: [
        { id: 1, name: 'Dashboard', subName: 'แดชบอร์ด', moduleCode: 'Dashboard', isDashboard: true, viewAccess: true, view: 'all', add: 'none', edit: 'none' },
        { id: 2, name: 'Staff Info', subName: 'ข้อมูลบุคลากร', moduleCode: 'Staff_info', isDashboard: false, viewAccess: false, view: 'all', add: 'all', edit: 'all' },
        { id: 3, name: 'Research Info', subName: 'ข้อมูลวิจัย', moduleCode: 'Research_info', isDashboard: false, viewAccess: false, view: 'all', add: 'all', edit: 'all' },
        { id: 4, name: 'Plans / Projects', subName: 'แผนงาน / โครงการ', moduleCode: 'Plan_Project', isDashboard: false, viewAccess: false, view: 'all', add: 'all', edit: 'all' },
        { id: 5, name: 'Training', subName: 'ข้อมูลอบรม', moduleCode: 'Training', isDashboard: false, viewAccess: false, view: 'all', add: 'all', edit: 'all' }
      ]
    },
    {
      name: 'ผู้บริหาร',
      permissions: [
        { id: 1, name: 'Dashboard', subName: 'แดชบอร์ด', moduleCode: 'Dashboard', isDashboard: true, viewAccess: true, view: 'all', add: 'none', edit: 'none' },
        { id: 2, name: 'Staff Info', subName: 'ข้อมูลบุคลากร', moduleCode: 'Staff_info', isDashboard: false, viewAccess: false, view: 'all', add: 'none', edit: 'none' },
        { id: 3, name: 'Research Info', subName: 'ข้อมูลวิจัย', moduleCode: 'Research_info', isDashboard: false, viewAccess: false, view: 'all', add: 'none', edit: 'none' },
        { id: 4, name: 'Plans / Projects', subName: 'แผนงาน / โครงการ', moduleCode: 'Plan_Project', isDashboard: false, viewAccess: false, view: 'all', add: 'none', edit: 'none' },
        { id: 5, name: 'Training', subName: 'ข้อมูลอบรม', moduleCode: 'Training', isDashboard: false, viewAccess: false, view: 'all', add: 'none', edit: 'none' }
      ]
    },
    {
      name: 'อาจารย์',
      permissions: [
        { id: 1, name: 'Dashboard', subName: 'แดชบอร์ด', moduleCode: 'Dashboard', isDashboard: true, viewAccess: true, view: 'all', add: 'none', edit: 'none' },
        { id: 2, name: 'Staff Info', subName: 'ข้อมูลบุคลากร', moduleCode: 'Staff_info', isDashboard: false, viewAccess: false, view: 'dept', add: 'none', edit: 'own' },
        { id: 3, name: 'Research Info', subName: 'ข้อมูลวิจัย', moduleCode: 'Research_info', isDashboard: false, viewAccess: false, view: 'all', add: 'dept', edit: 'own' },
        { id: 4, name: 'Plans / Projects', subName: 'แผนงาน / โครงการ', moduleCode: 'Plan_Project', isDashboard: false, viewAccess: false, view: 'all', add: 'none', edit: 'none' },
        { id: 5, name: 'Training', subName: 'ข้อมูลอบรม', moduleCode: 'Training', isDashboard: false, viewAccess: false, view: 'all', add: 'own', edit: 'own' }
      ]
    },
    {
      name: 'สายสนับสนุน',
      permissions: [
        { id: 1, name: 'Dashboard', subName: 'แดชบอร์ด', moduleCode: 'Dashboard', isDashboard: true, viewAccess: true, view: 'all', add: 'none', edit: 'none' },
        { id: 2, name: 'Staff Info', subName: 'ข้อมูลบุคลากร', moduleCode: 'Staff_info', isDashboard: false, viewAccess: false, view: 'dept', add: 'none', edit: 'none' },
        { id: 3, name: 'Research Info', subName: 'ข้อมูลวิจัย', moduleCode: 'Research_info', isDashboard: false, viewAccess: false, view: 'dept', add: 'dept', edit: 'dept' },
        { id: 4, name: 'Plans / Projects', subName: 'แผนงาน / โครงการ', moduleCode: 'Plan_Project', isDashboard: false, viewAccess: false, view: 'dept', add: 'none', edit: 'none' },
        { id: 5, name: 'Training', subName: 'ข้อมูลอบรม', moduleCode: 'Training', isDashboard: false, viewAccess: false, view: 'all', add: 'dept', edit: 'dept' }
      ]
    }
  ];

  ngOnInit() {
    this.initTemplates();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => { this.imagePreview.set(reader.result as string); };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  initTemplates() {
    const saved = localStorage.getItem('unified_perm_templates');
    if (saved) {
      try { this.templates.set(JSON.parse(saved)); } catch(e) { this.resetToDefaultTemplates(false); }
    } else {
      this.resetToDefaultTemplates(false);
    }
  }

  resetToDefaultTemplates(askConfirm = true) {
    if (askConfirm && !confirm('ต้องการคืนค่าเทมเพลตสิทธิ์ทั้งหมดกลับเป็นค่าเริ่มต้นหรือไม่?')) return;
    this.templates.set(JSON.parse(JSON.stringify(this.defaultTemplates)));
    localStorage.setItem('unified_perm_templates', JSON.stringify(this.defaultTemplates));
    this.clearTable();
  }

  applyTemplate(tpl: any) {
    this.currentTemplateName.set(tpl.name);
    this.modules = JSON.parse(JSON.stringify(tpl.permissions));

    // ระบบเปลี่ยน Role อัตโนมัติ (ถ้าเลือกแอดมิน ให้ช่อง Role เป็นแอดมินด้วย)
    if (tpl.name === 'แอดมิน' || tpl.name.toLowerCase().includes('admin')) {
      this.staffData.role = 'admin';
    } else {
      this.staffData.role = 'teacher';
    }
  }

  saveTemplate() {
    const defaultName = this.currentTemplateName() || '';
    const name = prompt('กรุณาตั้งชื่อเทมเพลตสิทธิ์นี้:', defaultName);
    if (!name || name.trim() === '') return;

    const current = this.templates();
    const existingIndex = current.findIndex(t => t.name === name.trim());
    const newTemplate = { name: name.trim(), permissions: JSON.parse(JSON.stringify(this.modules)) };

    let updated;
    if (existingIndex !== -1) {
       if (confirm(`มีเทมเพลตชื่อ "${name.trim()}" อยู่แล้ว ต้องการบันทึกทับใช่หรือไม่?`)) {
          updated = [...current]; updated[existingIndex] = newTemplate;
       } else { return; }
    } else { updated = [...current, newTemplate]; }

    this.templates.set(updated);
    this.currentTemplateName.set(name.trim());
    localStorage.setItem('unified_perm_templates', JSON.stringify(updated));
    alert('บันทึกเทมเพลตสำเร็จ!');
  }

  deleteTemplate(name: string) {
    if (confirm(`⚠️ ต้องการลบเทมเพลต "${name}" ใช่หรือไม่?`)) {
      const updated = this.templates().filter(t => t.name !== name);
      this.templates.set(updated);
      localStorage.setItem('unified_perm_templates', JSON.stringify(updated));
      if (this.currentTemplateName() === name) this.clearTable();
    }
  }

  clearTable() {
    this.currentTemplateName.set('');
    this.modules.forEach(mod => {
      if (mod.isDashboard) mod.viewAccess = false;
      else { mod.view = 'none'; mod.add = 'none'; mod.edit = 'none'; }
    });
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
    formData.append('role', this.staffData.role);
    formData.append('permissions', JSON.stringify(permissionsToSend));
    
    if (this.staffData.deptId !== null) {
      formData.append('deptId', this.staffData.deptId.toString());
    }

    if (this.selectedFile) {
      formData.append('img_profile', this.selectedFile, this.selectedFile.name);
    }

    // 🌟 เปลี่ยนการส่ง Header ให้ใช้ JWT Token
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.post<any>('http://localhost:8080/api/add_staff.php', formData, { headers })
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response && response.success) {
            this.showSuccessModal.set(true);
          } else {
            alert('❌ บันทึกไม่สำเร็จ: \n' + (response?.message || ''));
          }
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          alert(`🚨 การเชื่อมต่อล้มเหลว รหัส: ${err.status}`);
        }
      });
  }

  closeModal() {
    this.showSuccessModal.set(false);
    this.router.navigate(['/staff']);
  }
}