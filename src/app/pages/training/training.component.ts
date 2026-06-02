import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './training.component.html',
  styleUrl: './training.component.css'
})
export class TrainingComponent {
  
  mockTrainings = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    staffName: i % 2 === 0 ? 'ผศ.ดร. สมชาย ใจดี' : 'อ. สมหญิง รักเรียน',
    topic: i % 2 === 0 ? 'AI ในการสอนยุคใหม่' : 'การเขียนขอทุนวิจัยระดับชาติ',
    date: '15 พ.ค. 2568',
    location: 'โรงแรมเซ็นทารา แกรนด์',
    benefits: 'เข้าใจเทคนิคการเขียน Prompt...',
    implementation: 'นำไปปรับใช้ในรายวิชา CS101...',
    remarks: '-',
    cost: 4500
  }));

  currentPage = signal(1);
  itemsPerPage = 10;

  paginatedTrainings = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.mockTrainings.slice(startIndex, startIndex + this.itemsPerPage);
  });

  totalPages = computed(() => Math.ceil(this.mockTrainings.length / this.itemsPerPage));

  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  goToPage(page: number) { this.currentPage.set(page); }
  nextPage() { if(this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }
  prevPage() { if(this.currentPage() > 1) this.currentPage.update(p => p - 1); }
}