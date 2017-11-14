Assumptions
-----------

The following things are assumed to be true in this documentation.

* You are running OSX.
* You are using Python 2.7. (Probably the version that came OSX.)
* You have [virtualenv](https://pypi.python.org/pypi/virtualenv) and [virtualenvwrapper](https://pypi.python.org/pypi/virtualenvwrapper) installed and working.
* You have NPR's AWS credentials stored as environment variables locally.

For more details on the technology stack used with the app-template, see our [development environment blog post](http://blog.apps.npr.org/2013/06/06/how-to-setup-a-developers-environment.html).


Bootstrap the project
---------------------

```
cd data_script
mkvirtualenv irma-florida-power
pip install -r requirements.txt
```

Run the notebook
---------------

`
cd data_script
jupyter notebook
`

The homepage of the notebook should open automatically in your preferred browser. Notebooks generally run on `localhost:8888` if it is the sole notebook running.

Open `outage_reports.ipynb`

To run the cells, either use `cmd + <enter>` or use the navigation: cell -> run all

Updating the data
---------------

- Download the Excel sheet from [FloridaDisaster.com](http://www.floridadisaster.org/info/outage_reports/latest.pdf).
- Use Adobe Acrobat or another program to convert the Excel sheet to a CSV and put it in the `data`.
- In the notebook, replace the source of `df_latest` data.
- Rerun the notebook.
