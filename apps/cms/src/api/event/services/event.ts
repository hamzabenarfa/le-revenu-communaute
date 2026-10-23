import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import type { Viewer } from '../../discussion/services/discussion';

const UID = 'api::event.event';

interface EventRow {
  id: number;
  documentId: string;
  title: string;
  host: string;
  startsAt: string;
  goingBase?: number;
  category?: { slug: string } | null;
  attendees?: Array<{ id: number }>;
}

export default factories.createCoreService(UID, ({ strapi }) => {
  const serialize = (e: EventRow, viewer: Viewer | null) => ({
    documentId: e.documentId,
    title: e.title,
    host: e.host,
    startsAt: new Date(e.startsAt).toISOString(),
    category: e.category?.slug ?? null,
    going: (e.goingBase ?? 0) + (e.attendees?.length ?? 0),
    attending: Boolean(viewer && e.attendees?.some((a) => a.id === viewer.id)),
  });
  const populate = { category: { select: ['slug'] }, attendees: { select: ['id'] } };

  return {
    /** Upcoming "Le Revenu répond" sessions, optionally for one space. */
    async upcoming(category: string | null, viewer: Viewer | null) {
      const rows = (await strapi.db.query(UID).findMany({
        where: { startsAt: { $gte: new Date() }, ...(category ? { category: { slug: category } } : {}) },
        select: ['id', 'documentId', 'title', 'host', 'startsAt', 'goingBase'],
        populate,
        orderBy: [{ startsAt: 'asc' }],
        limit: 5,
      })) as EventRow[];
      return { data: rows.map((e) => serialize(e, viewer)) };
    },

    async toggleRsvp(documentId: string, viewer: Viewer) {
      const e = (await strapi.db.query(UID).findOne({
        where: { documentId },
        select: ['id', 'documentId', 'title', 'host', 'startsAt', 'goingBase'],
        populate,
      })) as EventRow | null;
      if (!e) throw new errors.NotFoundError('Événement introuvable.');
      const attending = e.attendees?.some((a) => a.id === viewer.id);
      await strapi.db.query(UID).update({
        where: { id: e.id },
        data: { attendees: attending ? { disconnect: [viewer.id] } : { connect: [viewer.id] } },
      });
      const attendees = attending ? (e.attendees ?? []).filter((a) => a.id !== viewer.id) : [...(e.attendees ?? []), { id: viewer.id }];
      return { data: serialize({ ...e, attendees }, viewer) };
    },
  };
});
