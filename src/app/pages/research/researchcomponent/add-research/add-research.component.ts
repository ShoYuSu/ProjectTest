import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-add-research',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './add-research.component.html',
  styleUrl: './add-research.component.css'
})
export class AddResearchComponent implements OnInit {
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
  
  // 🌟 เพิ่ม Signal สำหรับเก็บชื่อไฟล์ที่ผู้ใช้เลือก
  selectedFileName = signal<string>('');

  formData = {
    title: '',
    dept_id: '3', 
    year_funded: new Date().getFullYear() + 543,
    year_ended: new Date().getFullYear() + 543,
    funding_source: '',
    budget: null as number | null,
    attached_file: '', // 🌟 ตัวแปรเก็บ Base64 หรือ Path เดิม
    authors: [] as Array<{ staff_id: string; role: string }>
  };

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
    
    let setupUrl = 'http://localhost:8080/api/add_research.php';
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

        // 🌟 Permission-Based Only
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

        if (this.isEditMode() && res.setupData.project_data) {
          const pd = res.setupData.project_data;
          this.formData.title = pd.title;
          this.formData.funding_source = pd.funding_source;
          this.formData.budget = pd.budget ? Number(pd.budget) : null;
          this.formData.year_funded = pd.year_funded;
          this.formData.year_ended = pd.year_ended;
          if (pd.dept_id) this.formData.dept_id = pd.dept_id.toString();
          
          // 🌟 ดึงไฟล์เดิมมาเซ็ตในฟอร์ม
          if (pd.attached_file) {
            this.formData.attached_file = "http://localhost:8080/api/" + pd.attached_file;
          }

          if (pd.authors && pd.authors.length > 0) {
            this.formData.authors = pd.authors;
          }
        }

        if (scope === 'department' || scope === 'self') {
          if (myDeptId && !this.isEditMode()) this.formData.dept_id = myDeptId; 
        }

        if (this.formData.authors.length === 0) {
          if (scope === 'self' && myStaffId) {
             this.formData.authors.push({ staff_id: myStaffId, role: 'หัวหน้าโครงการ' });
          } else {
             this.formData.authors.push({ staff_id: '', role: 'หัวหน้าโครงการ' });
          }
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        alert('❌ ไม่สามารถดึงข้อมูลพื้นฐานได้');
        this.loading.set(false);
      }
    });
  }

  // 🌟 ฟังก์ชันจัดการเมื่อผู้ใช้เลือกไฟล์ (แปลงเอกสารเป็น Base64)
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileName.set(file.name);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.formData.attached_file = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  addAuthorRow() { this.formData.authors.push({ staff_id: '', role: 'ผู้ร่วมวิจัย' }); }

  removeAuthorRow(index: number) {
    if (this.formData.authors.length > 1) this.formData.authors.splice(index, 1);
    else alert('โครงการวิจัยจำเป็นต้องมีผู้รับผิดชอบอย่างน้อย 1 คนครับ');
  }

  submitForm() {
    if (!this.formData.title.trim() || !this.formData.funding_source.trim() || !this.formData.year_funded || !this.formData.year_ended) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนก่อนทำการบันทึกครับ'); return;
    }

    if (Number(this.formData.year_funded) > Number(this.formData.year_ended)) {
      alert('❌ ปี พ.ศ. ที่สิ้นสุดโครงการ จะต้องไม่น้อยกว่าปี พ.ศ. ที่เริ่มได้รับทุนครับ'); return;
    }

    if (this.formData.authors.some(a => !a.staff_id)) {
      alert('กรุณาเลือกชื่ออาจารย์ในช่องที่มีอยู่ให้ครบถ้วนครับ'); return;
    }

    const principalCount = this.formData.authors.filter(a => a.role === 'หัวหน้าโครงการ').length;
    if (principalCount !== 1) {
      alert('❌ กรุณาระบุ "หัวหน้าโครงการ" เพียง 1 ท่านเท่านั้นครับ'); 
      return;
    }

    if (this.userScope() === 'self' && this.currentStaffId()) {
      const hasSelf = this.formData.authors.some(a => a.staff_id.toString() === this.currentStaffId().toString());
      if (!hasSelf) {
        alert('❌ ในฐานะผู้ใช้งานทั่วไป คุณจำเป็นต้องระบุชื่อของตนเองเป็นหนึ่งในผู้รับผิดชอบโครงการด้วยครับ');
        return;
      }
    }

    this.isSubmitting.set(true);
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const payload = { ...this.formData, id: this.editId };
    const apiUrl = this.isEditMode() 
      ? 'http://localhost:8080/api/update_research.php' 
      : 'http://localhost:8080/api/add_research.php';

    this.http.post<any>(apiUrl, payload, { headers })
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            alert('✅ ' + (this.isEditMode() ? 'อัปเดตข้อมูลสำเร็จ' : 'บันทึกสำเร็จ'));
            this.router.navigate(['/research']); 
          } else {
            alert('❌ ปฏิเสธการบันทึก: ' + res.message);
            this.isSubmitting.set(false);
          }
        },
        error: (err) => {
          console.error(err);
          const errMsg = err.error?.message || err.error?.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
          alert('❌ ' + errMsg);
          this.isSubmitting.set(false);
        }
      });
  }
}