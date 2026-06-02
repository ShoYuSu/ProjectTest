import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.css'
})
export class PlansComponent {
  
  // จำลองข้อมูล 12 อันเพื่อดูระบบเปลี่ยนหน้า
  mockPlans = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    projectName: i % 2 === 0 ? 'การพัฒนาแอปพลิเคชันจัดการขยะ "Reach You"' : 'แพลตฟอร์ม IoT สำหรับการจัดการน้ำอัจฉริยะ',
    subActivity: i % 2 === 0 ? 'พัฒนาและทดสอบระบบบน Android' : 'จัดซื้ออุปกรณ์เซ็นเซอร์และบอร์ด Arduino',
    strategy: i % 2 === 0 ? 'ยุทธศาสตร์ที่ 2: นวัตกรรม' : 'ยุทธศาสตร์ที่ 1: การเรียนการสอน',
    planType: i % 2 === 0 ? 'แผนงานวิจัยและพัฒนา' : 'แผนงานปฏิบัติการ',
    responsible: i % 2 === 0 ? 'จรรยา แหยมเจริญ' : 'รศ.ดร. สมชาย ใจดี',
    approvedBudget: i % 2 === 0 ? 150000 : 50000,
    usedBudget: i % 2 === 0 ? 125000 : 50000,
    status: i % 2 === 0 ? 'อยู่ระหว่างดำเนินการ' : 'เสร็จสิ้น',
    details: i % 2 === 0 ? 'กำลังดำเนินการในเฟสที่ 2' : 'ติดตั้งอุปกรณ์เสร็จสิ้นและส่งมอบงานเรียบร้อยแล้ว'
  }));

  // --- ระบบ Pagination ---
  currentPage = signal(1);
  itemsPerPage = 10;

  paginatedPlans = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.mockPlans.slice(startIndex, startIndex + this.itemsPerPage);
  });

  totalPages = computed(() => Math.ceil(this.mockPlans.length / this.itemsPerPage));

  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  goToPage(page: number) { this.currentPage.set(page); }
  nextPage() { if(this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }
  prevPage() { if(this.currentPage() > 1) this.currentPage.update(p => p - 1); }
}