import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-add-article',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './add-article.component.html',
  styleUrl: './add-article.component.css'
})
export class AddArticleComponent {
  // สลับประเภทบทความ: 'conference' หรือ 'journal'
  activeType = signal('conference');

  // ตัวอย่างรายชื่อผู้เขียน
  authors = signal([
    { id: 1, name: 'ดร. ลอร์ดโวลเดอมอร์', role: 'ผู้ประพันธ์หลัก' }
  ]);

  removeAuthor(id: number) {
    this.authors.update(list => list.filter(a => a.id !== id));
  }
}