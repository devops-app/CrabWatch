"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const roles_1 = require("../constants/roles");
const statuses_1 = require("../constants/statuses");
const species_1 = require("../constants/species");
const regions_1 = require("../constants/regions");
describe('Shared Constants', () => {
    describe('USER_ROLES', () => {
        it('should have all three roles defined', () => {
            expect(Object.keys(roles_1.USER_ROLES)).toHaveLength(3);
            expect(roles_1.USER_ROLES).toHaveProperty('user');
            expect(roles_1.USER_ROLES).toHaveProperty('researcher');
            expect(roles_1.USER_ROLES).toHaveProperty('admin');
        });
        it('should have descriptive role values', () => {
            expect(roles_1.USER_ROLES.user).toContain('User');
            expect(roles_1.USER_ROLES.researcher).toContain('Researcher');
            expect(roles_1.USER_ROLES.admin).toContain('Admin');
        });
    });
    describe('ROLE_HIERARCHY', () => {
        it('should define correct hierarchy order', () => {
            expect(roles_1.ROLE_HIERARCHY.user).toBe(0);
            expect(roles_1.ROLE_HIERARCHY.researcher).toBe(1);
            expect(roles_1.ROLE_HIERARCHY.admin).toBe(2);
        });
        it('should have admin with highest hierarchy', () => {
            expect(roles_1.ROLE_HIERARCHY.admin).toBeGreaterThan(roles_1.ROLE_HIERARCHY.researcher);
            expect(roles_1.ROLE_HIERARCHY.researcher).toBeGreaterThan(roles_1.ROLE_HIERARCHY.user);
        });
    });
    describe('OBSERVATION_STATUSES', () => {
        it('should have all three statuses', () => {
            expect(Object.keys(statuses_1.OBSERVATION_STATUSES)).toHaveLength(3);
            expect(statuses_1.OBSERVATION_STATUSES).toHaveProperty('pending');
            expect(statuses_1.OBSERVATION_STATUSES).toHaveProperty('approved');
            expect(statuses_1.OBSERVATION_STATUSES).toHaveProperty('rejected');
        });
    });
    describe('MUD_CRAB_SPECIES', () => {
        it('should have four species', () => {
            expect(species_1.MUD_CRAB_SPECIES).toHaveLength(4);
        });
        it('should have all required fields for each species', () => {
            species_1.MUD_CRAB_SPECIES.forEach((species) => {
                expect(species).toHaveProperty('id');
                expect(species).toHaveProperty('scientificName');
                expect(species).toHaveProperty('commonName');
                expect(species).toHaveProperty('shortName');
                expect(typeof species.id).toBe('string');
                expect(typeof species.scientificName).toBe('string');
                expect(typeof species.commonName).toBe('string');
                expect(typeof species.shortName).toBe('string');
            });
        });
        it('should include all Scylla species', () => {
            const ids = species_1.MUD_CRAB_SPECIES.map((s) => s.id);
            expect(ids).toContain('scylla-serrata');
            expect(ids).toContain('scylla-olivacea');
            expect(ids).toContain('scylla-paramamosain');
            expect(ids).toContain('scylla-tranquebarica');
        });
    });
    describe('Pagination constants', () => {
        it('should have correct default and max page limits', () => {
            expect(species_1.DEFAULT_PAGE_LIMIT).toBe(20);
            expect(species_1.MAX_PAGE_LIMIT).toBe(100);
            expect(species_1.MAX_PAGE_LIMIT).toBeGreaterThan(species_1.DEFAULT_PAGE_LIMIT);
        });
    });
    describe('MALAYSIAN_STATES', () => {
        it('should have 16 states', () => {
            expect(regions_1.MALAYSIAN_STATES).toHaveLength(16);
        });
        it('should include key states', () => {
            expect(regions_1.MALAYSIAN_STATES).toContain('Selangor');
            expect(regions_1.MALAYSIAN_STATES).toContain('Johor');
            expect(regions_1.MALAYSIAN_STATES).toContain('Kedah');
            expect(regions_1.MALAYSIAN_STATES).toContain('Sabah');
            expect(regions_1.MALAYSIAN_STATES).toContain('Sarawak');
            expect(regions_1.MALAYSIAN_STATES).toContain('Kuala Lumpur');
        });
        it('should have unique state names', () => {
            const unique = new Set(regions_1.MALAYSIAN_STATES);
            expect(unique.size).toBe(regions_1.MALAYSIAN_STATES.length);
        });
    });
    describe('COASTAL_STATES', () => {
        it('should be a subset of MALAYSIAN_STATES', () => {
            regions_1.COASTAL_STATES.forEach((state) => {
                expect(regions_1.MALAYSIAN_STATES).toContain(state);
            });
        });
        it('should have 15 coastal states', () => {
            expect(regions_1.COASTAL_STATES).toHaveLength(15);
        });
        it('should include Perlis as a coastal state', () => {
            expect(regions_1.COASTAL_STATES).toContain('Perlis');
        });
    });
    describe('MALAYSIA_BOUNDS', () => {
        it('should have valid geographic bounds', () => {
            expect(regions_1.MALAYSIA_BOUNDS.north).toBeGreaterThan(regions_1.MALAYSIA_BOUNDS.south);
            expect(regions_1.MALAYSIA_BOUNDS.east).toBeGreaterThan(regions_1.MALAYSIA_BOUNDS.west);
            expect(regions_1.MALAYSIA_BOUNDS.center.lat).toBeGreaterThan(0);
            expect(regions_1.MALAYSIA_BOUNDS.center.lng).toBeGreaterThan(0);
        });
        it('should have center within bounds', () => {
            const { center, north, south, east, west } = regions_1.MALAYSIA_BOUNDS;
            expect(center.lat).toBeGreaterThanOrEqual(south);
            expect(center.lat).toBeLessThanOrEqual(north);
            expect(center.lng).toBeGreaterThanOrEqual(west);
            expect(center.lng).toBeLessThanOrEqual(east);
        });
    });
});
//# sourceMappingURL=constants.test.js.map