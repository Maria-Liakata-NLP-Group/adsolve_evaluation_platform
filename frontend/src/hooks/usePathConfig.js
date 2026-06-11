/** @format */

import { useEffect, useState } from 'react';
import { getInfrastructure, getPaths, getUseCases } from '../api/config';

export function usePathConfig() {
  const [useCases, setUseCases] = useState([]);
  const [paths, setPaths] = useState([]);
  const [infrastructure, setInfrastructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getUseCases(), getPaths(), getInfrastructure()])
      .then(([uc, p, infra]) => {
        setUseCases(uc);
        setPaths(p);
        setInfrastructure(infra);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { useCases, paths, infrastructure, loading, error };
}
