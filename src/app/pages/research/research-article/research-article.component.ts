import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-research-article',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './research-article.component.html',
  styleUrl: './research-article.component.css'
})
export class ResearchArticleComponent {
  activeTab = 'conference'; 

  // ข้อมูลจำลอง (เพิ่มฟิลด์ของวารสารเข้าไปด้วย เพื่อให้สลับแสดงผลได้)
  mockArticles = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    title: `การพัฒนาแอปพลิเคชัน "Reach You" สำหรับการบริหารจัดการขยะ (ฉบับที่ ${i + 1})`,
    authors: 'จรรยา แหยมเจริญ,\nพัสรัฐ อาจหาญศิริวงศ์,\nอัตพล ยมพ้วย\nและ ณพงษ์ สมัครกิจ',
    
    // --- ฟิลด์สำหรับ ประชุมวิชาการ ---
    conferenceName: 'การประชุมวิชาการระดับชาติ ครั้งที่ 17 มหาวิทยาลัยราชภัฏนครปฐม',
    location: 'โรงแรม ไมด้า แกรนด์ ทวารวดี นครปฐม',
    
    // --- ฟิลด์สำหรับ วารสาร ---
    journalName: 'วารสารวิชาการวิทยาศาสตร์และเทคโนโลยี',
    issue: `Vol. ${i + 1} No. 2`,
    page: `${10 + i}-${25 + i}`,
    
    // --- ใช้ร่วมกัน ---
    date: '3 กรกฎาคม 2568'
  }));

  // --- ระบบ Pagination ---
  currentPage = signal(1);
  itemsPerPage = 10;

  paginatedArticles = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.mockArticles.slice(startIndex, startIndex + this.itemsPerPage);
  });

  totalPages = computed(() => Math.ceil(this.mockArticles.length / this.itemsPerPage));
  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  goToPage(page: number) { this.currentPage.set(page); }
  nextPage() { if(this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }
  prevPage() { if(this.currentPage() > 1) this.currentPage.update(p => p - 1); }
}