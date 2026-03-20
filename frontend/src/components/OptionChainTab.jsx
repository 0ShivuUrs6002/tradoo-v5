export const OptionChainTab = ({ data }) => {
  const rows = data?.optionChain || [];

  return (
    <div className="panel table-wrap">
      <table className="table option-table">
        <thead>
          <tr>
            <th>Strike</th>
            <th>Call OI</th>
            <th>Put OI</th>
            <th>Call Vol</th>
            <th>Put Vol</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 20).map((row) => (
            <tr key={row.strike}>
              <td>{row.strike}</td>
              <td>{row.callOI}</td>
              <td>{row.putOI}</td>
              <td>{row.callVolume}</td>
              <td>{row.putVolume}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
