const { randomUUID } = require("node:crypto");
const { User, UserStatus } = require("../../dist/modules/users/user.entity");
const { Role } = require("../../dist/modules/role/role.entity");
const { DoctorProfile, DoctorApplicationStatus } = require("../../dist/modules/doctors/doctor-profile.entity");
const { TypeOrmAuthRepository } = require("../../dist/modules/auth/typeorm-auth.repository");
module.exports = async function fixture(db) {
  const roleRepo = db.getRepository(Role), userRepo = db.getRepository(User), roles = {};
  for (const name of ["DOCTOR", "PATIENT", "ADMIN"]) roles[name] = await roleRepo.findOneBy({ name }) ?? await roleRepo.save(roleRepo.create({ name }));
  async function person(label, role) {
    const user = await userRepo.save(userRepo.create({ email: randomUUID() + "@communication-test.invalid", firstName: label,
      lastName: "Synthetic", passwordHash: "synthetic-not-a-login", status: UserStatus.ACTIVE, roles: [roles[role]] }));
    if (role === "DOCTOR") await db.getRepository(DoctorProfile).save({ userId: user.id, bmdcNumber: "TEST-" + randomUUID(),
      applicationStatus: DoctorApplicationStatus.APPROVED, languages: [], experienceYears: 0 });
    return new TypeOrmAuthRepository(db).findUserById(user.id);
  }
  return { doctor: await person("Doctor A", "DOCTOR"), colleague: await person("Doctor B", "DOCTOR"),
    outsider: await person("Doctor C", "DOCTOR"), patient: await person("Patient", "PATIENT"),
    admin: await person("Admin A", "ADMIN"), staff: await person("Admin B", "ADMIN") };
};
