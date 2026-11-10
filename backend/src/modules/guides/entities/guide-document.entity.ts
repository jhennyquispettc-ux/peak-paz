import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { VerificationDocumentBase } from '../../../common/entities/verification-document.base.js';
import { GuideDocumentType } from '../guides.enums.js';
import { GuideProfile } from './guide-profile.entity.js';

@Entity('guide_documents')
export class GuideDocument extends VerificationDocumentBase {
  @Column({ name: 'guide_profile_id', type: 'uuid' })
  guideProfileId: string;

  @ManyToOne(() => GuideProfile, (profile) => profile.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'guide_profile_id' })
  guideProfile: Relation<GuideProfile>;

  @Column({
    type: 'enum',
    enum: GuideDocumentType,
    enumName: 'guide_document_type',
  })
  type: GuideDocumentType;
}
