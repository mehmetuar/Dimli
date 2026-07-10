import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AccountDeletion } from '../account-deletions/account-deletion.entity';
import { computeBoundingBox } from '../common/geo.util';
import { JoinRequest } from '../join-requests/join-request.entity';
import { Notification } from '../notifications/notification.entity';
import { Team } from '../teams/team.entity';
import { ReverseGeocodeService } from '../geo/reverse-geocode.service';
import { normalizeUsername } from './username.util';
import { CloudinaryService } from '../files/cloudinary.service';
import { sanitizeUser } from '../common/sanitize-user.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(AccountDeletion)
    private accountDeletionRepository: Repository<AccountDeletion>,
    @InjectRepository(JoinRequest)
    private joinRequestRepository: Repository<JoinRequest>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    private reverseGeocode: ReverseGeocodeService,
    private cloudinaryService: CloudinaryService,
  ) {}

  normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.startsWith('0')) return '90' + cleaned.slice(1);
    if (!cleaned.startsWith('90')) return '90' + cleaned;
    return cleaned;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const normalized = this.normalizePhone(phone);
    return this.usersRepository.findOne({ where: { phone: normalized } });
  }

  async create(userData: CreateUserDto): Promise<User> {
    try {
      if (!userData.password) {
        throw new BadRequestException('Şifre gerekli.');
      }

      // Harf duyarsız kontrol: DB'de eski büyük harfli kayıt kalmış olsa bile
      // ("Hakam" varken "hakam") mükerrer kaydı engeller. Unique constraint
      // yarış durumu sigortası olarak kalır.
      const taken = await this.isUsernameTaken(userData.username);
      if (taken) {
        throw new ConflictException('Bu kullanıcı adı zaten kullanılıyor.');
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const newUser = this.usersRepository.create({
        ...userData,
        phone: this.normalizePhone(userData.phone),
        password: hashedPassword,
        phoneVerified: true,
      });
      return await this.usersRepository.save(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Username-anahtarlı TEK lookup ilkeli (login buradan geçer). Girdi normalize
  // edilir ve LOWER() ile karşılaştırılır — eski uygulama sürümlerinden gelen
  // "Hakam" gibi büyük harfli girişler de doğru kullanıcıyı bulur.
  async findOne(username: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.team', 'team')
      .where('LOWER(user.username) = :u', { u: normalizeUsername(username) })
      .getOne();
  }

  async isUsernameTaken(
    username: string,
    excludeId?: string,
  ): Promise<boolean> {
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) = :u', { u: normalizeUsername(username) });
    if (excludeId) {
      qb.andWhere('user.id != :excludeId', { excludeId });
    }
    const user = await qb.getOne();
    return !!user;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id }, relations: ['team'] });
  }

  // Oyuncu Ekle araması: keşfet DEĞİL. Yalnız TAM kullanıcı adı (harf duyarsız) eşleşir
  // (username benzersiz → 0/1 sonuç). Yanıt herkese-açık alanlarla sınırlı (şifre vb. sızmaz).
  async search(query: string): Promise<Partial<User>[]> {
    // normalize: transliterasyon sayesinde "Işık" araması "isik"i bulur
    const q = normalizeUsername(query);
    if (!q) return [];
    const users = await this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) = LOWER(:q)', { q })
      .limit(10)
      .getMany();
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      avatarUrl: u.avatarUrl,
      position: u.position,
      secondaryPosition: u.secondaryPosition,
      location: u.location,
      nationality: u.nationality,
      rating: u.rating,
    }));
  }

  async getJokers(geoFilter: {
    lat: number;
    lng: number;
    radius: number;
    position?: string;
    sharesFee?: boolean;
    offset?: number;
    limit?: number;
  }): Promise<{ jokers: any[]; hasMore: boolean }> {
    const {
      lat,
      lng,
      radius,
      position,
      sharesFee,
      offset = 0,
      limit = 50,
    } = geoFilter;
    const PAGE = Math.min(limit, 100);

    const positionMap: Record<string, string> = {
      kaleci: 'Kaleci',
      orta_saha: 'Orta Saha',
      forvet: 'Forvet',
      defans: 'Defans',
    };
    const dbPosition = position ? (positionMap[position] ?? null) : null;

    // Bounding-box ön-filtre (indeksli lat/lng aralığı) tam-tablo Haversine'i
    // önler; kesin eşik yine Haversine (business/match-announcements ile aynı
    // desen, ortak computeBoundingBox). acos girdisi FP taşmasına karşı
    // [-1, 1]'e kırpılır (aynı koordinattaki joker "input is out of range" verirdi).
    const box = computeBoundingBox(lat, lng, radius);
    const params: any[] = [
      lat,
      lng,
      radius,
      box.minLat,
      box.maxLat,
      box.minLng,
      box.maxLng,
    ];
    let extraWhere = '';

    if (dbPosition) {
      params.push(dbPosition);
      extraWhere += ` AND ("position" = $${params.length} OR "secondaryPosition" = $${params.length})`;
    }
    if (sharesFee !== undefined) {
      params.push(sharesFee);
      extraWhere += ` AND "sharesFee" = $${params.length}`;
    }

    params.push(PAGE + 1); // limit+1 → hasMore tespiti
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const raw: any[] = await this.usersRepository.query(
      `SELECT id,
                (6371 * acos(GREATEST(-1.0, LEAST(1.0,
                    cos(radians($1)) * cos(radians(latitude))
                    * cos(radians(longitude) - radians($2))
                    + sin(radians($1)) * sin(radians(latitude))
                )))) AS distance_km
             FROM "user"
             WHERE "isJoker" = true
               AND latitude IS NOT NULL
               AND longitude IS NOT NULL
               AND latitude BETWEEN $4 AND $5
               AND longitude BETWEEN $6 AND $7
               AND (
                   6371 * acos(GREATEST(-1.0, LEAST(1.0,
                       cos(radians($1)) * cos(radians(latitude))
                       * cos(radians(longitude) - radians($2))
                       + sin(radians($1)) * sin(radians(latitude))
                   )))
               ) <= $3
               ${extraWhere}
             ORDER BY distance_km ASC, id ASC
             LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    const hasMore = raw.length > PAGE;
    const page = raw.slice(0, PAGE);

    if (page.length === 0) return { jokers: [], hasMore: false };

    const ids = page.map((r) => r.id);
    const distanceMap = new Map<string, number>(
      page.map((r) => [r.id, parseFloat(Number(r.distance_km).toFixed(1))]),
    );

    const jokers = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.team', 'team')
      .where('user.id IN (:...ids)', { ids })
      .getMany();

    // Tam sanitizasyon (common/sanitize-user.util) — eskiden yalnız password+pushToken
    // siliniyordu, email/telefon/GPS/phoneVerified/chatBan* diğer kullanıcılara sızıyordu.
    // Joker kartı bu hassas alanları okumaz; iletişim sohbet üzerinden yürür.
    const mapped = jokers
      .map((u) => ({
        ...sanitizeUser(u),
        distanceKm: distanceMap.get(u.id) ?? 0,
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return { jokers: mapped, hasMore };
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
    if (updateUserDto.username) {
      const taken = await this.isUsernameTaken(updateUserDto.username, id);
      if (taken) {
        throw new ConflictException('Bu kullanıcı adı zaten kullanılıyor.');
      }
    }
    // Koordinat güncellendiğinde ilçeyi (location) SUNUCU türetir — tek yetkili kaynak.
    // Offline point-in-polygon; harici geocoder/ücret yok. Türkiye dışında/eşleşme
    // yoksa location'a dokunulmaz (mevcut/son bilinen ilçe korunur).
    if (updateUserDto.latitude != null && updateUserDto.longitude != null) {
      const hit = this.reverseGeocode.lookup(
        updateUserDto.latitude,
        updateUserDto.longitude,
      );
      if (hit) {
        updateUserDto.location = hit.district;
      }
    }
    await this.usersRepository.update(id, updateUserDto);
    return this.usersRepository.findOne({ where: { id }, relations: ['team'] });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(id, { password: hashedPassword });
  }

  // Bir cihaz push token'ı global olarak TEK hesaba bağlı olmalıdır. Aksi halde
  // aynı cihazda hesap değiştirildiğinde (çıkış yapılmadan) önceki hesabın
  // bildirimleri yeni hesaba düşer. Bu yüzden token'ı önce HER İKİ tablodaki
  // diğer tüm satırlardan çöz, sonra çağıranın satırına yaz — hepsi tek transaction.
  async updatePushToken(id: string, pushToken: string): Promise<void> {
    if (!pushToken) return;
    await this.usersRepository.manager.transaction(async (em) => {
      await em.query(
        'UPDATE "user" SET "pushToken" = NULL WHERE "pushToken" = $1 AND id <> $2',
        [pushToken, id],
      );
      await em.query(
        'UPDATE "business_owner" SET "pushToken" = NULL WHERE "pushToken" = $1',
        [pushToken],
      );
      await em.query('UPDATE "user" SET "pushToken" = $1 WHERE id = $2', [
        pushToken,
        id,
      ]);
    });
  }

  // Çıkışta çağrılır: yalnızca çağıranın kendi satırını temizler (token değeriyle
  // DEĞİL, id ile — yarış halinde başka hesabın yeniden kaydettiği token'ı silmemek için).
  async clearPushToken(id: string): Promise<void> {
    await this.usersRepository.query(
      'UPDATE "user" SET "pushToken" = NULL WHERE id = $1',
      [id],
    );
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mevcut şifre hatalı.');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.usersRepository.update(id, { password: hashedPassword });
  }

  /**
   * Takıma bağlı tüm kayıtları koparıp takımı siler (teams.service.ts purgeTeam
   * ile aynı SQL sırası — orada değişiklik yapılırsa burası da güncellenmeli).
   * Bu takımın maç ilanlarına bağlı chat_channels da temizlenir (öksüz sohbet kalmasın).
   * Tek transaction: yarıda kalırsa hiçbir şey değişmez.
   * teamName: rezervasyon ad-snapshot'ı (rakip "Bu takım artık mevcut değil" bilgisi).
   */
  private async purgeTeamRaw(teamId: string, teamName: string): Promise<void> {
    await this.usersRepository.manager.transaction(async (em) => {
      await em.query(`DELETE FROM "challenges" WHERE "fromTeamId" = $1`, [
        teamId,
      ]);
      await em.query(`DELETE FROM "join_requests" WHERE "teamId" = $1`, [
        teamId,
      ]);
      // Bu takımın maçlarına bağlı sohbet kanalları (maç grubu + joker müzakere) —
      // maç ilanları silinmeden ÖNCE. teams.service.ts purgeTeam ile SENKRON.
      await em.query(
        `DELETE FROM "chat_channels"
           WHERE type IN ('MATCH_GROUP','JOKER_NEGOTIATION')
             AND "relatedMatchId" IN (
               SELECT id::text FROM "match_announcements" WHERE "team_id" = $1
             )`,
        [teamId],
      );
      await em.query(`DELETE FROM "match_announcements" WHERE "team_id" = $1`, [
        teamId,
      ]);
      await em.query(`DELETE FROM "ratings" WHERE "targetTeamId" = $1`, [
        teamId,
      ]);
      await em.query(
        `UPDATE "reservation" SET "deletedTeamName" = $1
           WHERE ("teamId" = $2 OR "opponentTeamId" = $2) AND "deletedTeamName" IS NULL`,
        [teamName, teamId],
      );
      await em.query(
        `UPDATE "reservation" SET "teamId" = NULL WHERE "teamId" = $1`,
        [teamId],
      );
      await em.query(
        `UPDATE "reservation" SET "opponentTeamId" = NULL WHERE "opponentTeamId" = $1`,
        [teamId],
      );
      await em.query(
        `UPDATE "user" SET "team_id" = NULL WHERE "team_id" = $1`,
        [teamId],
      );
      await em.query(`DELETE FROM "team" WHERE "id" = $1`, [teamId]);
    });
  }

  async deleteAccount(
    userId: string,
    data: { reason: string; note?: string; password: string },
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) throw new UnauthorizedException('Şifre hatalı');

    // 1. JoinRequests sil
    await this.joinRequestRepository.delete({ userId });

    // 3. Notifications sil
    await this.notificationRepository.delete({ userId });

    // 4a. Kullanıcının dahil olduğu 1:1 kanallar (joker müzakere + DM) TAMAMEN silinir —
    //     katılımcı-silme (4) ÖNCESİ, ki hangi kanallara ait olduğunu hâlâ bulabilelim.
    //     Cascade peer'in katılımcı satırını + mesajları alır → karşı tarafta ölü DM kalmaz.
    //     MATCH_GROUP bilinçli HARİÇ: joker maç grubundan sadece ayrılır, grup ayakta kalır.
    await this.usersRepository.query(
      `DELETE FROM "chat_channels"
         WHERE type IN ('JOKER_NEGOTIATION','DM')
           AND id IN (SELECT "channelId" FROM "chat_participants_v2" WHERE "userId" = $1)`,
      [userId],
    );

    // 4. ChatParticipants hard-delete (FK kısıtlaması soft-delete ile çözülmez)
    await this.usersRepository.query(
      `DELETE FROM "chat_participants_v2" WHERE "userId" = $1`,
      [userId],
    );

    // 5. ChatMessages senderId null yap (raw SQL — entity tipi union sorununu aşar)
    await this.usersRepository.query(
      `UPDATE "chat_messages" SET "senderId" = NULL WHERE "senderId" = $1`,
      [userId],
    );

    // Tek üyeli takım kaptanı silinince o takım da purge edilir → logosunu Cloudinary'den
    // temizlemek için URL'yi purge ÖNCESİ yakala (silme sonrası referans-sayımlı sil).
    let purgedTeamLogoUrl: string | null = null;

    // 6. Takım kaptanlığı devret / kullanıcıyı takımdan çıkar
    const userWithTeam = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['team'],
    });
    if (userWithTeam?.team) {
      const team = await this.teamRepository.findOne({
        where: { id: userWithTeam.team.id },
        relations: ['players'],
      });
      if (team) {
        if (team.captainId === userId) {
          const viceCaptainIds: string[] = (team.viceCaptainIds || []).filter(
            (id) => id !== userId,
          );
          const newCaptainId: string | null =
            viceCaptainIds[0] ??
            team.players?.find((p) => p.id !== userId)?.id ??
            null;
          if (newCaptainId === null) {
            // Devredilecek kimse yok (tek kişilik takım): takımı ÖKSÜZ bırakma
            // (captainId=NULL kalırsa artık hiç kimse silemez — "Mavi şimşekler"
            // vakası), bağlı kayıtları koparıp takımı sil.
            // teams.service.ts purgeTeam ile aynı SQL sırası (dairesel modül
            // bağımlılığı kurmamak için burada raw uygulanır).
            purgedTeamLogoUrl = team.logoUrl;
            await this.purgeTeamRaw(team.id, team.name);
          } else {
            // Raw SQL — TypeORM update() undefined değerini NULL yazmaz
            await this.teamRepository.query(
              `UPDATE "team" SET "captainId" = $1, "viceCaptainIds" = $2 WHERE id = $3`,
              [
                newCaptainId,
                viceCaptainIds.filter((id) => id !== newCaptainId).join(','),
                team.id,
              ],
            );
          }
        } else {
          const cleaned = (team.viceCaptainIds || []).filter(
            (id) => id !== userId,
          );
          await this.teamRepository.query(
            `UPDATE "team" SET "viceCaptainIds" = $1 WHERE id = $2`,
            [cleaned.join(','), team.id],
          );
        }
      }
    }

    // Team'in captain FK referansını temizle (FK_... constraint hatası önlenir)
    await this.teamRepository.query(
      `UPDATE "team" SET "captainId" = NULL WHERE "captainId" = $1`,
      [userId],
    );

    // Kullanıcıyı takımdan çıkar (user tarafındaki FK)
    await this.usersRepository.query(
      `UPDATE "user" SET "team_id" = NULL WHERE id = $1`,
      [userId],
    );

    // 7. Kullanıcıyı sil
    await this.usersRepository.delete(userId);

    // 8. Silme kaydını kaydet — SADECE başarılı silmeden sonra
    await this.accountDeletionRepository.save({
      reason: data.reason,
      note: data.note || null,
      userName: user.full_name,
      userEmail: user.email,
      userPhone: user.phone,
      userUsername: user.username,
    });

    // 9. Kullanıcı (ve varsa purge edilen tek üyeli takım) DB'den silindikten SONRA
    //    görselleri Cloudinary'den temizle — referans-sayımlı (paylaşımlı URL korunur),
    //    hata yutulur (silme zaten tamamlandı).
    await this.cloudinaryService.safeDestroy(user.avatarUrl);
    if (purgedTeamLogoUrl)
      await this.cloudinaryService.safeDestroy(purgedTeamLogoUrl);
  }
}
