import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  profileData: any = null;
  loading = true;
  errorMessage = '';

  canEditProfile = false;     
  canViewPermissions = false; 
  canEditPermissions = false; 
  
  isEditProfileMode = false;
  isEditPermissionMode = false;
  
  editData: any = {};
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  modules = [
    { id: 1, name: 'Dashboard', subName: 'แดชบอร์ด', moduleCode: 'Dashboard', isDashboard: true, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 2, name: 'Staff Info', subName: 'ข้อมูลบุคลากร', moduleCode: 'Staff_info', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 3, name: 'Research Info', subName: 'ข้อมูลวิจัย', moduleCode: 'Research_info', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 4, name: 'Plans / Projects', subName: 'แผนงาน / โครงการ', moduleCode: 'Plan_Project', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' },
    { id: 5, name: 'Training', subName: 'ข้อมูลอบรม', moduleCode: 'Training', isDashboard: false, viewAccess: false, view: 'none', add: 'none', edit: 'none' }
  ];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone          
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.fetchProfileData(id);
      } else {
        this.errorMessage = 'ไม่พบรหัสบุคลากร';
        this.loading = false;
      }
    });
  }

  fetchProfileData(id: string): void {
    this.loading = true;
    this.errorMessage = '';

    // 🌟 เปลี่ยนการส่ง Header ให้ใช้ JWT Token
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>(`http://localhost:8080/api/get_staff_profile.php?id=${id}`, { headers })
      .subscribe({
        next: (response) => {
          this.ngZone.run(() => {
            if (response && response.status === 'success') {
              this.profileData = response.data;
              
              this.canEditProfile = response.can_edit_profile;
              this.canEditPermissions = response.can_edit_permissions;
              
              this.canViewPermissions = this.canEditPermissions || response.is_owner;

              this.mapPermissionsToModules(response.data.permissions);
            } else {
              this.errorMessage = response?.message || 'เกิดข้อผิดพลาด';
            }
            this.loading = false;
            this.cdr.detectChanges(); 
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.errorMessage = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ PHP ได้ (ตรวจสอบพอร์ต 8080)';
            this.loading = false;
            this.cdr.detectChanges();
          });
        }
      });
  }

  toggleEditProfile() {
    this.isEditProfileMode = true;
    this.isEditPermissionMode = false;
    this.imagePreview = null;
    
    this.editData = {
      update_type: 'profile',
      person_id: this.profileData.person_id,
      fullName: this.profileData.basic_info.full_name,
      email: this.profileData.basic_info.email,
      expertise: ''
    };

    this.editData.education = this.profileData.education ? JSON.parse(JSON.stringify(this.profileData.education)) : [];

    if (this.profileData.expertise && this.profileData.expertise.length > 0) {
      this.editData.expertise = this.profileData.expertise.join(', ');
    }

    this.editData.achievements = this.profileData.achievements ? JSON.parse(JSON.stringify(this.profileData.achievements)) : [];
    this.editData.existingCertificates = this.profileData.certificates ? [...this.profileData.certificates] : [];
    this.editData.deletedCertificates = []; 
    this.editData.newCertificates = []; 
    this.editData.newCertificatesPreview = []; 
  }

  cancelEditProfile() {
    this.isEditProfileMode = false;
    this.imagePreview = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.editData.newImage = reader.result as string; 
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  addEducation() {
    if (!this.editData.education) this.editData.education = [];
    this.editData.education.push({ degree_level: '', field_of_study: '', university: '', graduation_year: '' });
  }

  removeEducation(index: number) {
    this.editData.education.splice(index, 1);
  }

  onCertificateSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.editData.newCertificatesPreview.push(e.target.result);
          this.editData.newCertificates.push(e.target.result);
        };
        reader.readAsDataURL(files[i]);
      }
    }
  }

  removeExistingCertificate(url: string, index: number) {
    this.editData.deletedCertificates.push(url);
    this.editData.existingCertificates.splice(index, 1);
  }

  removeNewCertificate(index: number) {
    this.editData.newCertificates.splice(index, 1);
    this.editData.newCertificatesPreview.splice(index, 1);
  }

  addAchievement() {
    if (!this.editData.achievements) this.editData.achievements = [];
    this.editData.achievements.push({ achievement_name: '', achievement_year: new Date().getFullYear().toString() });
  }

  removeAchievement(index: number) {
    this.editData.achievements.splice(index, 1);
  }

  toggleEditPermissions() {
    this.isEditPermissionMode = true;
    this.isEditProfileMode = false;
  }

  cancelEditPermissions() {
    this.isEditPermissionMode = false;
    this.mapPermissionsToModules(this.profileData.permissions);
  }

  mapPermissionsToModules(apiPerms: any[]) {
    this.modules.forEach(m => { m.view = 'none'; m.add = 'none'; m.edit = 'none'; m.viewAccess = false; });
    if (!apiPerms || apiPerms.length === 0) return;

    apiPerms.forEach(p => {
      const mod = this.modules.find(m => m.moduleCode === p.module_name);
      if (mod) {
        if (p.module_name === 'Dashboard' && p.action === 'view') {
          mod.viewAccess = (p.scope === 'all');
        } else {
          let scope = p.scope === 'self' ? 'own' : (p.scope === 'department' ? 'dept' : p.scope);
          if (p.action === 'view') mod.view = scope;
          if (p.action === 'add') mod.add = scope;
          if (p.action === 'edit') mod.edit = scope;
        }
      }
    });
  }

  private mapScopeToDatabase(scopeValue: string): string {
    if (scopeValue === 'own') return 'self';
    if (scopeValue === 'dept') return 'department';
    return scopeValue; 
  }

  saveData() {
    // 🌟 เปลี่ยนการส่ง Header ให้ใช้ JWT Token
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    let payload: any = {};

    if (this.isEditProfileMode) {
      payload = { ...this.editData };
    } 
    else if (this.isEditPermissionMode) {
      const permsToSend = this.modules.map(mod => ({
        module_name: mod.moduleCode,
        view: mod.isDashboard ? (mod.viewAccess ? 'all' : 'none') : this.mapScopeToDatabase(mod.view),
        add: this.mapScopeToDatabase(mod.add),
        edit: this.mapScopeToDatabase(mod.edit)
      }));

      payload = {
        update_type: 'permissions',
        target_user_id: this.profileData.basic_info.user_id,
        permissions: permsToSend
      };
    }

    this.http.post('http://localhost:8080/api/get_staff_profile.php', payload, { headers })
      .subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            this.isEditProfileMode = false;
            this.isEditPermissionMode = false;
            alert('✅ บันทึกข้อมูลเรียบร้อยแล้ว!');
            this.fetchProfileData(this.profileData.person_id);
          } else {
            alert('❌ บันทึกไม่สำเร็จ: ' + res.message);
          }
        },
        error: (err) => {
          alert('❌ เชื่อมต่อเซิร์ฟเวอร์เพื่อบันทึกข้อมูลล้มเหลว');
        }
      });
  }
}