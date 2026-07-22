import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; 
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'; 

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

  // 🌟 ตัวแปรสำหรับควบคุม Modal
  isModalOpen = false;
  modalFileUrl: SafeResourceUrl | string = '';
  modalFileType: 'image' | 'pdf' = 'image';
  modalFileName: string = ''; 
  zoomLevel: number = 1; 

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
    private ngZone: NgZone,
    private sanitizer: DomSanitizer 
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const id = params['id'];
      this.fetchProfileData(id);
    });
  }

  fetchProfileData(id?: string): void {
    this.loading = true;
    this.errorMessage = '';

    const token = localStorage.getItem('token') || '';
    if (!token) {
        this.errorMessage = 'ไม่พบ Token การเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่';
        this.loading = false;
        return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    let apiUrl = 'http://localhost:8080/api/get_staff_profile.php';
    if (id) {
        apiUrl += `?id=${id}`;
    }

    this.http.get<any>(apiUrl, { headers })
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
            console.error(err);
            this.errorMessage = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ PHP ได้ หรือคุณไม่มีสิทธิ์เข้าถึง';
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
        this.ngZone.run(() => {
          this.editData.newImage = reader.result as string; 
          this.imagePreview = reader.result as string;
          this.cdr.detectChanges();
        });
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

  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // 🌟 อัปเดตฟังก์ชันถอดรหัสให้รองรับ URL-Safe Base64 ได้สมบูรณ์ 100%
  getFileName(url: string): string {
    try {
      let fileName = url.split('/').pop() || 'Document';
      fileName = decodeURIComponent(fileName);
      
      if (fileName.includes('_b64')) {
        const parts = fileName.split('_b64');
        const extIndex = parts[1].lastIndexOf('.');
        let encodedPart = extIndex !== -1 ? parts[1].substring(0, extIndex) : parts[1];
        
        // แปลง URL-Safe Base64 กลับเป็น Base64 ปกติ
        let base64Str = encodedPart.replace(/-/g, '+').replace(/_/g, '/');
        while (base64Str.length % 4) {
          base64Str += '=';
        }
        
        // ถอดรหัสอักขระภาษาไทย (UTF-8) ได้อย่างถูกต้อง
        return decodeURIComponent(escape(window.atob(base64Str)));
      }
      
      return fileName;
    } catch (e) {
      return url.split('/').pop() || 'Document';
    }
  }

  updateNewFileName(index: number, newName: string) {
    if (this.editData.newCertificates && this.editData.newCertificates[index]) {
      this.editData.newCertificates[index].file_name = newName;
    }
  }

  onCertificateSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.ngZone.run(() => {
            const base64 = e.target.result;
            
            this.editData.newCertificatesPreview.push({
              data: base64,
              name: file.name,
              type: file.type || 'unknown'
            });

            this.editData.newCertificates.push({
              file_data: base64,
              file_name: file.name
            });

            this.cdr.detectChanges();
          });
        };
        reader.readAsDataURL(file);
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

  // 🌟 ฟังก์ชันเปิด Modal พร้อมแนบชื่อไฟล์
  openModal(url: string, fileName: string) {
    const isPdf = url.toLowerCase().endsWith('.pdf') || url.includes('application/pdf');
    this.modalFileType = isPdf ? 'pdf' : 'image';
    this.modalFileUrl = isPdf ? this.sanitizeUrl(url) : url;
    this.modalFileName = fileName; 
    this.zoomLevel = 1; 
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.modalFileUrl = '';
  }

  zoomIn() {
    if (this.zoomLevel < 3) this.zoomLevel += 0.25;
  }

  zoomOut() {
    if (this.zoomLevel > 0.5) this.zoomLevel -= 0.25;
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
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    let payload: any = {};

    if (this.isEditProfileMode) {
      if (this.editData.newCertificatesPreview) {
        this.editData.newCertificates = this.editData.newCertificatesPreview.map((item: any) => ({
          file_data: item.data,
          file_name: item.name
        }));
      }

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
            
            if (this.isEditProfileMode && this.imagePreview) {
              localStorage.setItem('profile_image_override', this.imagePreview);
            }

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