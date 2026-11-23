import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { VerificationDocumentBase } from '../../../common/entities/verification-document.base.js';
import {
  AgencyDocumentType,
  RETIRED_AGENCY_DOCUMENTS,
} from '../agencies.enums.js';
import { Agency } from './agency.entity.js';

@Entity('agency_documents')
export class AgencyDocument extends VerificationDocumentBase {
  @Column({ name: 'agency_id', type: 'uuid' })
  agencyId: string;

  @ManyToOne(() => Agency, (agency) => agency.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'agency_id' })
  agency: Relation<Agency>;

  @Column({
    type: 'enum',
    enum: [...Object.values(AgencyDocumentType), ...RETIRED_AGENCY_DOCUMENTS],
    enumName: 'agency_document_type',
  })
  type: AgencyDocumentType;
}
