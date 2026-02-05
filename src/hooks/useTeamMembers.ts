/**
 * useTeamMembers - Team members management hooks
 * 
 * Architecture v1.4.1: Migrated to useTenantQueryBuilder
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  department: string;
  location: string | null;
  status: 'active' | 'away' | 'offline';
  joinDate: string;
  performance: number;
  avatarUrl?: string | null;
}

interface TeamMemberRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  department: string;
  location: string | null;
  status: string;
  join_date: string;
  performance: number | null;
  avatar_url: string | null;
}

export function useTeamMembers() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['team-members', tenantId],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('team_members', '*')
        .order('name');

      if (error) {
        console.error('Error fetching team members:', error);
        throw error;
      }

      return ((data as unknown as TeamMemberRow[]) || []).map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        department: row.department,
        location: row.location,
        status: row.status as 'active' | 'away' | 'offline',
        joinDate: row.join_date,
        performance: row.performance ?? 80,
        avatarUrl: row.avatar_url,
      }));
    },
    enabled: !!tenantId && isReady,
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  const { buildInsertQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (member: Omit<TeamMember, 'id'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await buildInsertQuery('team_members', {
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        department: member.department,
        location: member.location,
        status: member.status,
        join_date: member.joinDate,
        performance: member.performance,
        avatar_url: member.avatarUrl,
      })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', tenantId] });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TeamMember> & { id: string }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await buildUpdateQuery('team_members', {
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        role: updates.role,
        department: updates.department,
        location: updates.location,
        status: updates.status,
        join_date: updates.joinDate,
        performance: updates.performance,
        avatar_url: updates.avatarUrl,
      })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', tenantId] });
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();
  const { buildDeleteQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { error } = await buildDeleteQuery('team_members')
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', tenantId] });
    },
  });
}
