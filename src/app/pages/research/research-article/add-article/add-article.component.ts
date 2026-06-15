import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
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

  staffMembers = signal<any[]>([]);
  loading = signal(false);
  isSubmitting = signal(false);
  userScope = signal<string>('none'); 

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
    this.addAuthorRow(); 
    this.loadActiveStaff();
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
              this.formData.authors[0].staff_id = res.staff_list[0].staff_id.toString();
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

    const payload = { ...this.formData };
    if (payload.article_type === 'journal') {
      payload.conference_name = ''; payload.conference_date = ''; payload.conference_location = '';
    } else {
      payload.journal_name = ''; payload.journal_vol_issue = ''; payload.journal_quartile = '';
    }

    this.http.post<any>('http://localhost:8080/api/add_research_article.php', payload, { headers })
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            alert('✅ บันทึกสำเร็จ: ' + res.message);
            // 🌟 แก้ไขให้กลับไปที่หน้าหลักอย่างถูกต้อง
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