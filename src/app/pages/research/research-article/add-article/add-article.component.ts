import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router'; 
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

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

  isEditMode = signal(false);
  editId: string | null = null;

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
    authors: [] as Array<{ staff_id: string; role: string }>
  };

  ngOnInit() {
    this.loadActiveStaff();

    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        this.isEditMode.set(true);
        this.editId = params['edit'];
        
        const state = history.state;
        if (state && state.articleData) {
          const data = state.articleData;
          
          this.formData.article_type = data.type || 'journal';
          this.formData.title = data.title || '';
          this.formData.publish_year = data.year || (new Date().getFullYear() + 543);
          
          if (data.department_id) {
            this.formData.dept_id = data.department_id.toString();
          }

          this.formData.journal_name = data.journal_name || '';
          this.formData.journal_vol_issue = data.journal_vol_issue || '';
          this.formData.journal_quartile = data.journal_quartile || '';

          this.formData.conference_name = data.conference_name || '';
          this.formData.conference_date = data.conference_date || '';
          this.formData.conference_location = data.conference_location || '';

          if (data.authors_list && Array.isArray(data.authors_list) && data.authors_list.length > 0) {
            this.formData.authors = data.authors_list;
          }
        }
      }
      
      if (this.formData.authors.length === 0) {
        this.addAuthorRow(); 
      }
    });
  }

  loadActiveStaff() {
    this.loading.set(true);
    const currentUserId = localStorage.getItem('user_id') || '14';
    const headers = new HttpHeaders().set('X-User-Id', currentUserId);
    
    this.http.get<any>('http://localhost:8080/api/add_research_article.php', { headers })
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            this.userScope.set(res.scope);
            this.staffMembers.set(res.staff_list || []);
            
            if ((res.scope === 'department' || res.scope === 'self') && res.my_dept_id) {
              this.formData.dept_id = res.my_dept_id.toString();
            }

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
          alert('❌ ไม่สามารถดึงข้อมูลแบบฟอร์มได้: ' + (err.error?.message || 'Unauthorized'));
          this.loading.set(false);
        }
      });
  }

  addAuthorRow() {
    this.formData.authors.push({ staff_id: '', role: 'ผู้นิพนธ์ชื่อแรก (First Author)' });
  }

  removeAuthorRow(index: number) {
    if (this.formData.authors.length > 1) {
      this.formData.authors.splice(index, 1);
    } else {
      alert('บทความวิจัยจำเป็นต้องมีผู้นิพนธ์อย่างน้อย 1 คนครับ');
    }
  }

  submitForm() {
    if (!this.formData.title.trim() || !this.formData.publish_year) {
      alert('กรุณากรอกชื่อบทความและปี พ.ศ. ให้ครบถ้วนครับ');
      return;
    }

    if (this.formData.article_type === 'journal' && !this.formData.journal_name.trim()) {
      alert('กรุณากรอกชื่อวารสารวิชาการที่ตีพิมพ์ครับ');
      return;
    }

    if (this.formData.article_type === 'conference' && !this.formData.conference_name.trim()) {
      alert('กรุณากรอกชื่องานประชุมวิชาการครับ');
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

    const payload = { 
      ...this.formData,
      id: this.editId 
    };

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
            alert('✅ ' + (this.isEditMode() ? 'อัปเดตข้อมูลสำเร็จ' : 'บันทึกสำเร็จ'));
            this.router.navigate(['/research/article']); 
          } else {
            alert('❌ ปฏิเสธการบันทึก: ' + res.message);
            this.isSubmitting.set(false);
          }
        },
        error: (err) => {
          console.error(err);
          alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + (err.error?.message || 'Server Error'));
          this.isSubmitting.set(false);
        }
      });
  }
}