import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

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
  private route = inject(ActivatedRoute); // 🌟 รับค่าพารามิเตอร์ URL

  staffMembers = signal<any[]>([]);
  loading = signal(false);
  isSubmitting = signal(false);
  userScope = signal<string>('none'); 

  // 🌟 ตัวแปรจัดการโหมดแก้ไข
  isEditMode = signal(false);
  editId: string | null = null;

  formData = {
    title: '',
    dept_id: '3', 
    year_funded: new Date().getFullYear() + 543,
    year_ended: new Date().getFullYear() + 543,
    funding_source: '',
    budget: null as number | null,
    authors: [] as Array<{ staff_id: string; role: string }>
  };

  ngOnInit() {
    this.loadActiveStaff();

    // 🌟 ตรวจสอบว่าเปิดมาจากปุ่ม Edit หรือไม่
    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        this.isEditMode.set(true);
        this.editId = params['edit'];
        
        // รับค่าข้อมูลแถวจากหน้าตารางที่แนบมา
        const state = history.state;
        if (state && state.projectData) {
          const data = state.projectData;
          
          // เติมข้อมูลลงฟอร์ม
          this.formData.title = data.name || '';
          this.formData.funding_source = data.fundSource || '';
          this.formData.budget = data.budget ? Number(data.budget) : null;
          this.formData.year_funded = data.year || (new Date().getFullYear() + 543);
          this.formData.year_ended = data.yearEnded || (new Date().getFullYear() + 543);
          
          if (data.department_id) {
            this.formData.dept_id = data.department_id.toString();
          }

          // หากเพื่อนส่งข้อมูลรายชื่อผู้ประพันธ์มาด้วย ก็เอามาใส่ ถ้าไม่มีสร้างแถวว่าง
          if (data.authors_list && Array.isArray(data.authors_list) && data.authors_list.length > 0) {
            this.formData.authors = data.authors_list;
          }
        }
      }
      
      // ถ้าเปิดมาแล้ว authors ว่างเปล่า ให้สร้างแถวรอไว้ 1 แถวเสมอ
      if (this.formData.authors.length === 0) {
        this.addAuthorRow(); 
      }
    });
  }

  loadActiveStaff() {
    this.loading.set(true);
    const currentUserId = localStorage.getItem('user_id') || '14';
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);
    
    this.http.get<any>('http://localhost:8080/api/add_research.php', { headers })
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            this.userScope.set(res.scope);
            this.staffMembers.set(res.staff_list || []);
            
            if ((res.scope === 'department' || res.scope === 'self') && res.my_dept_id) {
              this.formData.dept_id = res.my_dept_id.toString();
            }

            // บังคับล็อคชื่อกรณีเป็น User และไม่ได้อยู่ในโหมด Edit ที่มีชื่ออยู่แล้ว
            if (res.scope === 'self' && res.staff_list.length > 0) {
              if (this.formData.authors.length > 0 && !this.formData.authors[0].staff_id) {
                this.formData.authors[0].staff_id = res.staff_list[0].staff_id.toString();
              }
            }
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          alert('❌ ไม่สามารถดึงข้อมูลบัญชีรายชื่อได้');
          this.loading.set(false);
        }
      });
  }

  addAuthorRow() {
    this.formData.authors.push({ staff_id: '', role: 'หัวหน้าโครงการ' });
  }

  removeAuthorRow(index: number) {
    if (this.formData.authors.length > 1) {
      this.formData.authors.splice(index, 1);
    } else {
      alert('โครงการวิจัยจำเป็นต้องมีผู้รับผิดชอบอย่างน้อย 1 คนครับ');
    }
  }

  submitForm() {
    if (!this.formData.title.trim() || !this.formData.funding_source.trim() || !this.formData.year_funded || !this.formData.year_ended) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนก่อนทำการบันทึกครับ');
      return;
    }

    if (Number(this.formData.year_funded) > Number(this.formData.year_ended)) {
      alert('❌ ข้อผิดพลาดข้อมูล: ปี พ.ศ. ที่สิ้นสุดทุน จะต้องไม่น้อยกว่าปี พ.ศ. ที่เริ่มได้รับทุนสนับสนุนครับ');
      return;
    }

    const hasEmptyAuthor = this.formData.authors.some(a => !a.staff_id);
    if (hasEmptyAuthor) {
      alert('กรุณาเลือกชื่ออาจารย์ในช่องที่มีอยู่ให้ครบถ้วนครับ');
      return;
    }

    this.isSubmitting.set(true);
    const currentUserId = localStorage.getItem('user_id') || '14';
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);

    // 🌟 แนบ ID ของแถวที่แก้ไปด้วย (ถ้าโหมดสร้างใหม่ editId จะเป็น null)
    const payload = {
      ...this.formData,
      id: this.editId 
    };

    // 🌟 สลับ API ระหว่างเพิ่มข้อมูลใหม่ และอัปเดตข้อมูล
    const apiUrl = this.isEditMode() 
      ? 'http://localhost:8080/api/update_research.php' // ต้องให้เพื่อนทำไฟล์นี้เพิ่ม
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
          alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
          this.isSubmitting.set(false);
        }
      });
  }
}
//หลังจากใส่โค้ดนี้ หน้าเว็บจะมีการยิง API ไปที่ http://localhost:8080/api/update_research.php