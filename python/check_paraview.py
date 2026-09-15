"""Run with pvpython to check VTK file reading; synthetic data, no physics validation."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from paraview import servermanager
from paraview.simple import Delete, XMLImageDataReader


def main():
    # Literal fixture avoids generating the expected values with the reader's own writer.
    fixture = '''<?xml version="1.0"?>
<VTKFile type="ImageData" version="0.1" byte_order="LittleEndian">
  <ImageData WholeExtent="0 1 0 1 0 1" Origin="0 0 0" Spacing="0.001 0.001 0.001">
    <Piece Extent="0 1 0 1 0 1">
      <PointData Scalars="synthetic_temperature_K">
        <DataArray type="Float64" Name="synthetic_temperature_K" format="ascii">
          300 500 700 900 1100 1300 1500 1900
        </DataArray>
      </PointData><CellData/>
    </Piece>
  </ImageData>
</VTKFile>'''
    with TemporaryDirectory(prefix="metalliksa-paraview-") as directory:
        file = Path(directory) / "synthetic-temperature.vti"
        file.write_text(fixture, encoding="utf-8")
        reader = XMLImageDataReader(FileName=[str(file)])
        try:
            reader.UpdatePipeline()
            data = servermanager.Fetch(reader)
            values = data.GetPointData().GetArray("synthetic_temperature_K")
            if data.GetNumberOfPoints() != 8 or data.GetNumberOfCells() != 1 or values is None:
                raise RuntimeError("Unexpected VTK geometry or missing scalar field")
            observed = [values.GetTuple1(index) for index in range(values.GetNumberOfTuples())]
            if observed != [300, 500, 700, 900, 1100, 1300, 1500, 1900]:
                raise RuntimeError("VTK scalar values did not survive file reading")
            print(json.dumps({"status": "pass", "points": 8, "cells": 1,
                              "field": "synthetic_temperature_K", "range_K": list(values.GetRange()),
                              "scope": "Synthetic VTI reader smoke only; no GUI, renderer or solver validation"}))
        finally:
            Delete(reader)


if __name__ == "__main__":
    main()
