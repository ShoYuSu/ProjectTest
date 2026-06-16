import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { PlansComponent } from './pages/plans/planscomponent/plans.component';
import { AddPlansComponent } from './pages/plans/add-plans/add-plans.component';
import { ResearchComponent } from './pages/research/researchcomponent/research.component';
import { ResearchArticleComponent } from './pages/research/research-article/research-article.component';
import { StaffComponent } from './pages/staff/staff/staff.component';
import { AddStaffComponent } from './pages/staff/add-staff/add-staff.component';
import { ProfileComponent } from './pages/staff/profile/profile.component';
import { AddResearchComponent } from './pages/research/researchcomponent/add-research/add-research.component';
import { AddArticleComponent } from './pages/research/research-article/add-article/add-article.component';

// ⭐️ หมวด Training
import { TrainingComponent } from './pages/training/training.component';
import { AddTrainingComponent } from './pages/training/add-training/add-training.component';

export const routes: Routes = [
  // โครงสร้างที่มี Sidebar (หน้าอื่นๆ ทั้งหมดให้มาใส่ข้างใน children)
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },

      // หมวด Plans
      { path: 'plans', component: PlansComponent },
      { path: 'plans/add', component: AddPlansComponent },
      { path: 'plans/edit', component: AddPlansComponent }, // 🌟 Route สำหรับแก้ไข Plans

      // หมวด Research
      { path: 'research', component: ResearchComponent },
      { path: 'research/add-research', component: AddResearchComponent },
      { path: 'research/edit-research', component: AddResearchComponent }, // 🌟 Route สำหรับแก้ไข Research

      // หมวด Research Article
      { path: 'research/article', component: ResearchArticleComponent },
      { path: 'research/article/add', component: AddArticleComponent },
      { path: 'research/article/edit', component: AddArticleComponent }, // 🌟 Route สำหรับแก้ไข Article
      
      // หมวด Staff
      { path: 'staff', component: StaffComponent },
      { path: 'staff/add-staff', component: AddStaffComponent },
      { path: 'staff/edit-staff', component: AddStaffComponent }, // 🌟 Route สำหรับแก้ไข Staff
      { path: 'staff/profile', component: ProfileComponent },

      // หมวด Training
      { path: 'training', component: TrainingComponent },
      { path: 'training/add', component: AddTrainingComponent }, 
      { path: 'training/edit', component: AddTrainingComponent }, // 🌟 Route สำหรับแก้ไข Training
    ]
  },

  // ถ้าพิมพ์ path มั่วๆ หรือหาไม่เจอ ให้เด้งกลับไปหน้า dashboard เป็นค่าเริ่มต้น
  { path: '**', redirectTo: 'dashboard' }
];