import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User, UserRole, UserLevel } from './user.entity'
import { KycProfile, KycStatus } from './kyc-profile.entity'
import { OtpSession } from './otp-session.entity'
import { PublicProfile } from './public-profile.entity'
import { UserAddress } from './user-address.entity'
import { UserBankAccount } from './user-bank-account.entity'
import { UserProfile } from './user-profile.entity'
import { CreateUserDto } from './create-user.dto'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(KycProfile)
    private kycProfileRepository: Repository<KycProfile>,
    @InjectRepository(OtpSession)
    private otpSessionRepository: Repository<OtpSession>,
    @InjectRepository(PublicProfile)
    private publicProfileRepository: Repository<PublicProfile>,
    @InjectRepository(UserAddress)
    private addressRepository: Repository<UserAddress>,
    @InjectRepository(UserBankAccount)
    private bankAccountRepository: Repository<UserBankAccount>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find()
  }

  async findOne(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id })
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOneBy({ phone })
  }

  async createUser(data: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(data)
    return this.userRepository.save(user)
  }

  async updateLevel(id: string, level: UserLevel): Promise<User | null> {
    await this.userRepository.update(id, { level })
    return this.userRepository.findOneBy({ id })
  }

  async updateRole(id: string, role: UserRole): Promise<User | null> {
    await this.userRepository.update(id, { role })
    return this.userRepository.findOneBy({ id })
  }

  async createOtpSession(phone: string, codeHash: string, expiresAt: Date): Promise<OtpSession> {
    return this.otpSessionRepository.save(
      this.otpSessionRepository.create({ phone, code_hash: codeHash, isVerified: false, expiresAt }),
    )
  }

  async verifyOtpSession(id: string): Promise<OtpSession | null> {
    await this.otpSessionRepository.update(id, { isVerified: true })
    return this.otpSessionRepository.findOneBy({ id })
  }

  async findKyc(userId: string): Promise<KycProfile | null> {
    return this.kycProfileRepository.findOneBy({ userId })
  }

  async updateKyc(userId: string, status: KycStatus, rejectionReason?: string | null): Promise<KycProfile> {
    const existing = await this.findKyc(userId)
    const profile = existing || this.kycProfileRepository.create({ userId })

    profile.status = status
    profile.rejection_reason = rejectionReason ?? profile.rejection_reason
    return this.kycProfileRepository.save(profile)
  }

  async findProfile(userId: string): Promise<UserProfile | null> {
    return this.userProfileRepository.findOneBy({ userId })
  }

  async upsertProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await this.findProfile(userId)
    const profile = existing || this.userProfileRepository.create({ userId })

    profile.avatar_url = data.avatar_url ?? profile.avatar_url
    profile.bio = data.bio ?? profile.bio
    profile.birth_date = data.birth_date ?? profile.birth_date
    profile.isPublic = data.isPublic ?? profile.isPublic
    return this.userProfileRepository.save(profile)
  }

  async findAddresses(userId: string): Promise<UserAddress[]> {
    return this.addressRepository.findBy({ userId })
  }

  async addAddress(userId: string, data: Partial<UserAddress>): Promise<UserAddress> {
    return this.addressRepository.save(
      this.addressRepository.create({
        province: data.province,
        city: data.city,
        street: data.street,
        postal_code: data.postal_code,
        isDefault: data.isDefault,
        userId,
      }),
    )
  }

  async updateAddress(userId: string, addressId: string, data: Partial<UserAddress>): Promise<UserAddress> {
    const address = await this.addressRepository.findOneBy({ id: addressId, userId })
    if (!address) {
      throw new NotFoundException('آدرس یافت نشد')
    }
    Object.assign(address, {
      province: data.province ?? address.province,
      city: data.city ?? address.city,
      street: data.street ?? address.street,
      postal_code: data.postal_code ?? address.postal_code,
      isDefault: data.isDefault ?? address.isDefault,
    })
    return this.addressRepository.save(address)
  }

  async removeAddress(userId: string, addressId: string): Promise<{ deleted: boolean }> {
    const result = await this.addressRepository.delete({ id: addressId, userId })
    if (!result.affected) {
      throw new NotFoundException('آدرس یافت نشد')
    }
    return { deleted: true }
  }

  async findBankAccounts(userId: string): Promise<UserBankAccount[]> {
    return this.bankAccountRepository.findBy({ userId })
  }

  async addBankAccount(userId: string, data: Partial<UserBankAccount>): Promise<UserBankAccount> {
    return this.bankAccountRepository.save(
      this.bankAccountRepository.create({
        bankName: data.bankName,
        accountNumberHash: data.accountNumberHash,
        accountHolder: data.accountHolder,
        isDefault: data.isDefault,
        userId,
      }),
    )
  }

  async findPublicProfile(userId: string): Promise<PublicProfile | null> {
    return this.publicProfileRepository.findOneBy({ userId })
  }

  async upsertPublicProfile(userId: string, data: Partial<PublicProfile>): Promise<PublicProfile> {
    const existing = await this.findPublicProfile(userId)
    const profile = existing || this.publicProfileRepository.create({ userId })

    profile.displayName = data.displayName ?? profile.displayName
    profile.tagline = data.tagline ?? profile.tagline
    profile.avatar_url = data.avatar_url ?? profile.avatar_url
    profile.rating = data.rating ?? profile.rating
    return this.publicProfileRepository.save(profile)
  }
}
