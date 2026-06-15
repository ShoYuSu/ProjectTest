import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; // 👈 อย่าลืมนำเข้า FormsModule

@Component({
  selector: 'app-add-article',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule], // 👈 เพิ่ม FormsModule ตรงนี้
  templateUrl: './add-article.component.html',
  styleUrl: './add-article.component.css'
})
export class AddArticleComponent {
  // สลับประเภทบทความ: 'conference' หรือ 'journal'
  activeType = signal('conference');
  
  // ตัวแปรค้นหา
  searchQuery: string = '';

  // รายชื่อผู้เขียน (ใช้รูปแบบ Array เพื่อให้จัดการแก้ไขบทบาทได้ง่าย)
  authors = [
    { name: '', role: 'ผู้ประพันธ์หลัก', isEditingRole: false }
  ];

  addAuthor() {
    this.authors.push({ name: '', role: 'ผู้ร่วมประพันธ์', isEditingRole: false });
  }

  removeAuthor(index: number) {
    if (this.authors.length > 1) {
      this.authors.splice(index, 1);
    }
  }
}