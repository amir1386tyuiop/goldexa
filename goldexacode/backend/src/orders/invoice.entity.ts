import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'order_id' })
  orderId: string

  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string

  @Column('decimal', { name: 'total_amount', precision: 15, scale: 2 })
  totalAmount: number

  @Column({ nullable: true })
  pdf_url: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
