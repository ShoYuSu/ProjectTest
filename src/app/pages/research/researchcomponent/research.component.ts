import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-research',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './research.component.html',
  styleUrl: './research.component.css'
})
export class ResearchComponent {
  // ข้อมูลจำลองสำหรับตารางวิจัย
  mockProjects = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: i % 2 === 0 
      ? 'การศึกษาผลของการคั่วโดยใช้ไอน้ำร้อนยวด ยิ่งที่มีต่อคุณภาพของเมล็ดกาแฟโรบัสต้าที่สกัดคาเฟอีนออกโดยกระบวนการที่ใช้น้ำ' 
      : 'การพัฒนาแพลตฟอร์ม IoT สำหรับการจัดการน้ำในแปลงเกษตรอัจฉริยะ',
    author: i % 2 === 0 ? 'ผศ.ดร.ณฐมล จินดาพรรณ' : 'รศ.ดร. สมชาย ใจดี',
    year: '2566',
    fundSource: i % 2 === 0 ? 'สำนักงานพัฒนาวิทยาศาสตร์และเทคโนโลยีแห่งชาติ' : 'กองทุนวิจัยมหาวิทยาลัยสยาม',
    budget: i % 2 === 0 ? 600000 : 150000
  }));

  // --- ระบบ Pagination ---
  currentPage = signal(1);
  itemsPerPage = 10;

  // คำนวณข้อมูลที่จะแสดงเฉพาะหน้านั้นๆ
  paginatedProjects = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.mockProjects.slice(startIndex, startIndex + this.itemsPerPage);
  });

  // คำนวณจำนวนหน้าทั้งหมด
  totalPages = computed(() => Math.ceil(this.mockProjects.length / this.itemsPerPage));

  // สร้าง Array ตัวเลขหน้า [1, 2, 3...]
  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  goToPage(page: number) { this.currentPage.set(page); }
  nextPage() { if(this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }
  prevPage() { if(this.currentPage() > 1) this.currentPage.update(p => p - 1); }
}