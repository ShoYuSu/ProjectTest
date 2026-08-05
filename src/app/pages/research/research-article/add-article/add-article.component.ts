import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router'; 
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs'; 

@Component({
  selector: 'app-add-article',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './add-article.component.html',
  styleUrl: './add-article.component.css'
})
export class AddArticleComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute); 

  staffMembers = signal<any[]>([]);
  loading = signal(false);
  isSubmitting = signal(false);
  userScope = signal<string>('none'); 
  currentStaffId = signal<string>(''); 

  isEditMode = signal(false);
  editId: string | null = null;
  selectedFileName = signal<string>(''); 

  formData = {
    article_type: 'journal', 
    title: '',
    dept_id: '3', 
    publish_year: new Date().getFullYear() + 543, 
    journal_name: '',
    journal_vol_issue: '',
    journal_quartile: '',
    conference_name: '',
    conference_date: '',
    conference_location: '',
    attached_file: '', 
    authors: [] as Array<{ staff_id: string; role: string; is_external?: boolean; name?: string }>
  };

  // ตัวแปรเพิ่มคนนอก
  externalName: string = '';

  staffSearchQueries: { [index: number]: string } = {};
  isStaffDropdownOpen: { [index: number]: boolean } = {};

  // ==========================================
  // 🌟 [เริ่ม] ตัวแปรและฟังก์ชันสำหรับ Custom Confirm & Alert Modal
  // ==========================================
  isConfirmModalOpen = signal(false);
  confirmTitle = signal('');
  confirmMessage = signal('');
  confirmAction: (() => void) | null = null;

  isAlertModalOpen = signal(false);
  alertTitle = signal('');
  alertMessage = signal('');
  alertCallback: (() => void) | null = null;

  openConfirmModal(title: string, message: string, action: () => void) {
    this.confirmTitle.set(title);
    this.confirmMessage.set(message);
    this.confirmAction = action;
    this.isConfirmModalOpen.set(true);
  }

  closeConfirmModal() {
    this.isConfirmModalOpen.set(false);
    this.confirmAction = null;
  }

  confirmModalYes() {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.closeConfirmModal();
  }

  openAlertModal(title: string, message: string, callback: (() => void) | null = null) {
    this.alertTitle.set(title);
    this.alertMessage.set(message);
    this.alertCallback = callback;
    this.isAlertModalOpen.set(true);
  }

  closeAlertModal() {
    this.isAlertModalOpen.set(false);
    if (this.alertCallback) {
      this.alertCallback();
      this.alertCallback = null;
    }
  }
  // ==========================================

  getStaffName(staffId: string): string {
    if (!staffId) return '';
    const staff = this.staffMembers().find(s => s.staff_id === staffId);
    return staff ? `${staff.full_name} (${staff.position || 'บุคลากร'})` : '';
  }

  toggleStaffDropdown(index: number, event: Event) {
    event.stopPropagation();
    this.isStaffDropdownOpen[index] = !this.isStaffDropdownOpen[index];
    if (this.isStaffDropdownOpen[index]) {
      this.staffSearchQueries[index] = ''; 
    }
  }

  selectStaffForParticipant(index: number, staffId: string) {
    this.formData.authors[index].staff_id = staffId;
    this.isStaffDropdownOpen[index] = false;
  }

  getFilteredStaffList(index: number) {
    const query = (this.staffSearchQueries[index] || '').toLowerCase().trim();
    if (!query) return this.staffMembers();
    return this.staffMembers().filter(s =>
      s.full_name.toLowerCase().includes(query) ||
      (s.position && s.position.toLowerCase().includes(query))
    );
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        this.isEditMode.set(true);
        this.editId = params['edit'];
      }
      this.loadActiveStaff();
    });
  }

  loadActiveStaff() {
    this.loading.set(true);
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    let setupUrl = 'http://localhost:8080/api/add_research_article.php';
    if (this.isEditMode() && this.editId) {
      setupUrl += `?id=${this.editId}`;
    }

    forkJoin({
      profile: this.http.get<any>('http://localhost:8080/api/get_staff_profile.php', { headers }),
      perms: this.http.get<any>('http://localhost:8080/api/get_permissions.php', { headers }),
      setupData: this.http.get<any>(setupUrl, { headers })
    }).subscribe({
      next: (res) => {
        const mappedStaff = (res.setupData.staff_list || []).map((s: any) => ({
          staff_id: s.staff_id,
          full_name: s.full_name,
          position: s.position
        }));
        this.staffMembers.set(mappedStaff);

        let myDeptId = '';
        let myStaffId = '';
        if (res.profile && res.profile.status === 'success') {
          myDeptId = res.profile.data.basic_info.dept_id?.toString() || '';
          myStaffId = res.profile.data.basic_info.staff_id?.toString() || '';
          this.currentStaffId.set(myStaffId); 
        }

        let scope = 'none';
        const p = res.perms.permissions || res.perms || {};
        const modPerms = p['research_info'] || p['research'];
        
        if (modPerms) {
           const targetAction = this.isEditMode() ? 'edit' : 'add';
           if (modPerms[targetAction]) {
              scope = modPerms[targetAction].toString().toLowerCase().trim();
           }
        }
        this.userScope.set(scope);

        if (this.isEditMode() && res.setupData.article_data) {
          const ad = res.setupData.article_data;
          this.formData.article_type = ad.article_type || 'journal';
          this.formData.title = ad.title;
          this.formData.publish_year = ad.publish_year;
          this.formData.journal_name = ad.journal_name || '';
          this.formData.journal_vol_issue = ad.journal_vol_issue || '';
          this.formData.journal_quartile = ad.journal_quartile || '';
          this.formData.conference_name = ad.conference_name || '';
          this.formData.conference_date = ad.conference_date || '';
          this.formData.conference_location = ad.conference_location || '';
          if (ad.dept_id) this.formData.dept_id = ad.dept_id.toString();
          
          if (ad.attached_file) {
            this.formData.attached_file = "http://localhost:8080/api/" + ad.attached_file;
          }

          if (ad.authors && ad.authors.length > 0) {
            this.formData.authors = ad.authors.map((a: any) => ({
              staff_id: a.staff_id ? a.staff_id.toString() : '',
              role: a.role,
              is_external: !!a.external_name,
              name: a.external_name || ''
            }));
          }
        }

        if (scope === 'department' || scope === 'self') {
          if (myDeptId && !this.isEditMode()) this.formData.dept_id = myDeptId; 
        }

        if (this.formData.authors.length === 0) {
          if (scope === 'self' && myStaffId) {
             this.formData.authors.push({ staff_id: myStaffId, role: 'ผู้นิพนธ์หลัก (First Author)' });
          } else {
             this.formData.authors.push({ staff_id: '', role: 'ผู้นิพนธ์หลัก (First Author)' });
          }
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.openAlertModal('เกิดข้อผิดพลาด', '❌ ไม่สามารถดึงข้อมูลพื้นฐานได้');
        this.loading.set(false);
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5242880) {
        this.openAlertModal('ขนาดไฟล์ใหญ่เกินไป', '❌ ขนาดไฟล์ใหญ่เกินไป! กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB ครับ');
        event.target.value = ''; 
        return;
      }
      this.selectedFileName.set(file.name);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.formData.attached_file = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  addAuthorRow() { this.formData.authors.push({ staff_id: '', role: 'ผู้นิพนธ์ร่วม (Co-Author)' }); }
  
  addExternalAuthor() {
    if (!this.externalName.trim()) {
      this.openAlertModal('แจ้งเตือน', 'กรุณากรอกชื่อบุคคลภายนอกครับ');
      return;
    }
    const isDuplicate = this.formData.authors.some(a => a.name === this.externalName.trim());
    if (isDuplicate) {
      this.openAlertModal('แจ้งเตือน', 'มีชื่อบุคคลนี้ในรายการแล้วครับ');
      return;
    }
    this.formData.authors.push({
      staff_id: '',
      name: this.externalName.trim(),
      role: 'ผู้นิพนธ์ร่วม (Co-Author)', 
      is_external: true
    });
    this.externalName = ''; 
  }

  removeAuthorRow(index: number) {
    if (this.formData.authors.length > 1) this.formData.authors.splice(index, 1);
  }

  submitForm() {
    if (!this.formData.title.trim() || !this.formData.publish_year) {
      this.openAlertModal('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนก่อนทำการบันทึกครับ'); 
      return;
    }

    if (this.formData.authors.some(a => !a.staff_id && !a.is_external)) {
      this.openAlertModal('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกชื่ออาจารย์ในช่องที่มีอยู่ให้ครบถ้วนครับ'); 
      return;
    }

    const firstAuthorCount = this.formData.authors.filter(a => a.role === 'ผู้นิพนธ์หลัก (First Author)').length;
    if (firstAuthorCount !== 1) {
      this.openAlertModal('ข้อมูลไม่ถูกต้อง', '❌ กรุณาระบุ "ผู้นิพนธ์หลัก (First Author)" เพียง 1 ท่านเท่านั้นครับ');
      return;
    }

    this.isSubmitting.set(true);
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const payload = { ...this.formData, id: this.editId };

    if (payload.article_type === 'journal') {
      payload.conference_name = ''; payload.conference_date = ''; payload.conference_location = '';
    } else {
      payload.journal_name = ''; payload.journal_vol_issue = ''; payload.journal_quartile = '';
    }

    const apiUrl = this.isEditMode() 
      ? 'http://localhost:8080/api/update_research_article.php' 
      : 'http://localhost:8080/api/add_research_article.php';

    this.http.post<any>(apiUrl, payload, { headers })
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            this.openAlertModal('สำเร็จ', '✅ บันทึกบทความวิจัยและไฟล์สำเร็จ!', () => {
              this.router.navigate(['/research/article']); 
            });
          } else {
            this.openAlertModal('เกิดข้อผิดพลาด', '❌ ปฏิเสธการบันทึก: ' + res.message);
            this.isSubmitting.set(false);
          }
        },
        error: (err) => {
          console.error(err);
          this.openAlertModal('เกิดข้อผิดพลาด', '❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
          this.isSubmitting.set(false);
        }
      });
  }
}